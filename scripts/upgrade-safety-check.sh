#!/usr/bin/env bash
# =============================================================================
# upgrade-safety-check.sh
#
# Pre-upgrade safety validation for StellarVeriphy Soroban contracts.
#
# Usage:
#   ./scripts/upgrade-safety-check.sh <contract> <old_wasm> <new_wasm> [network]
#
# Arguments:
#   contract   — one of: oracle | provenance | registry
#   old_wasm   — path to the currently-deployed WASM (or "-" to skip compat check)
#   new_wasm   — path to the candidate WASM you want to deploy
#   network    — testnet | mainnet (default: testnet)
#
# Exit codes:
#   0  — all checks passed; safe to proceed
#   1  — one or more checks failed; do NOT deploy until resolved
#   2  — usage error
#
# What it checks:
#   1. WASM file existence and non-zero size
#   2. Storage key compatibility (DataKey enum diff between old and new source)
#   3. Struct field changes that may break persistent storage reads
#   4. Presence of a migration sequence doc for breaking changes
#   5. Rollback feasibility (contract ID logged, consumers recorded)
#   6. Admin / initialise guard present in new contract source
#   7. Network-specific safety gate (mainnet requires an explicit --confirm flag)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

pass()  { echo -e "${GREEN}[PASS]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; FAILED=$((FAILED+1)); }
info()  { echo -e "       $*"; }

FAILED=0

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <contract> <old_wasm|-> <new_wasm> [network] [--confirm]"
  exit 2
fi

CONTRACT="$1"
OLD_WASM="$2"
NEW_WASM="$3"
NETWORK="${4:-testnet}"
CONFIRM="${5:-}"

VALID_CONTRACTS="oracle provenance registry"
if ! echo "$VALID_CONTRACTS" | grep -qw "$CONTRACT"; then
  echo "Unknown contract '$CONTRACT'. Must be one of: $VALID_CONTRACTS"
  exit 2
fi

CONTRACT_SRC="contracts/${CONTRACT}/src/lib.rs"
MIGRATION_DOC="docs/operations/migration-${CONTRACT}.md"
DEPLOYMENT_LOG="docs/operations/deployment-log.md"

echo ""
echo "================================================================"
echo "  StellarVeriphy Contract Upgrade Safety Check"
echo "  Contract : $CONTRACT"
echo "  Network  : $NETWORK"
echo "  New WASM : $NEW_WASM"
echo "================================================================"
echo ""

# ---------------------------------------------------------------------------
# Check 1 — WASM file existence
# ---------------------------------------------------------------------------
echo "--- Check 1: WASM file existence ---"

if [[ ! -f "$NEW_WASM" ]]; then
  fail "New WASM not found at: $NEW_WASM"
  info "Build with: cd contracts/$CONTRACT && stellar contract build"
else
  SIZE=$(wc -c < "$NEW_WASM")
  if [[ "$SIZE" -lt 100 ]]; then
    fail "New WASM is suspiciously small ($SIZE bytes) — likely an empty file"
  else
    pass "New WASM found ($SIZE bytes)"
  fi
fi

if [[ "$OLD_WASM" != "-" ]]; then
  if [[ ! -f "$OLD_WASM" ]]; then
    fail "Old WASM not found at: $OLD_WASM (pass \"-\" to skip compatibility check)"
  else
    OLD_SIZE=$(wc -c < "$OLD_WASM")
    pass "Old WASM found ($OLD_SIZE bytes)"
  fi
fi

# ---------------------------------------------------------------------------
# Check 2 — Storage key compatibility
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 2: Storage key compatibility (DataKey diff) ---"

if [[ ! -f "$CONTRACT_SRC" ]]; then
  warn "Contract source not found at $CONTRACT_SRC — skipping DataKey diff"
else
  # Extract DataKey variants from source (handles both old-style and new typed keys)
  DATAKEY_VARIANTS=$(grep -oP '(?<=DataKey::)\w+' "$CONTRACT_SRC" | sort -u)
  DATAKEY_COUNT=$(echo "$DATAKEY_VARIANTS" | wc -l)

  pass "Found $DATAKEY_COUNT distinct DataKey variants in $CONTRACT source"

  # Check for variants that have been REMOVED compared to what the old WASM
  # exports (we approximate by checking if the source still contains all
  # known variant names from a reference list, if one exists)
  COMPAT_REFERENCE="docs/operations/storage-keys-${CONTRACT}.txt"
  if [[ -f "$COMPAT_REFERENCE" ]]; then
    REMOVED=()
    while IFS= read -r key; do
      if ! echo "$DATAKEY_VARIANTS" | grep -qx "$key"; then
        REMOVED+=("$key")
      fi
    done < "$COMPAT_REFERENCE"

    if [[ ${#REMOVED[@]} -gt 0 ]]; then
      fail "The following storage keys from the previous version are MISSING in the new source:"
      for k in "${REMOVED[@]}"; do
        info "  - DataKey::$k"
      done
      info "Removing a key breaks persistent storage reads for any data written under it."
      info "Document a migration plan in $MIGRATION_DOC before proceeding."
    else
      pass "All previously-recorded storage keys are still present"
    fi
  else
    warn "No storage key reference file at $COMPAT_REFERENCE"
    info "Run 'make snapshot-storage-keys' (or the command below) to create it:"
    info "  grep -oP '(?<=DataKey::)\w+' $CONTRACT_SRC | sort -u > $COMPAT_REFERENCE"
    info "Then re-run this check on the next upgrade."
  fi
fi

# ---------------------------------------------------------------------------
# Check 3 — Struct field changes
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 3: Public struct field changes ---"

if [[ ! -f "$CONTRACT_SRC" ]]; then
  warn "Source not found — skipping struct diff"
else
  # Count fields in key structs that affect persistent storage
  KEY_STRUCTS="ProvenanceCert VerificationRequest ProviderSLA CostEstimate ProviderInfo"
  for STRUCT in $KEY_STRUCTS; do
    COUNT=$(awk "/pub struct $STRUCT/,/^}/" "$CONTRACT_SRC" 2>/dev/null | grep -c 'pub ' || true)
    if [[ "$COUNT" -gt 0 ]]; then
      info "  $STRUCT: $COUNT pub fields"
    fi
  done

  STRUCT_SNAPSHOT="docs/operations/struct-snapshot-${CONTRACT}.txt"
  if [[ -f "$STRUCT_SNAPSHOT" ]]; then
    # Simple diff of field counts vs snapshot
    DIFF_RESULT=$(diff <(awk '/^#[[:space:]]/{name=$2} /pub /{print name, $0}' "$STRUCT_SNAPSHOT") \
                       <(for S in $KEY_STRUCTS; do
                           awk "/pub struct $S/,/^}/" "$CONTRACT_SRC" 2>/dev/null | \
                           grep 'pub ' | sed "s/^/  $S: /"
                         done) 2>/dev/null || true)
    if [[ -n "$DIFF_RESULT" ]]; then
      warn "Struct fields appear to have changed since the last snapshot:"
      info "$DIFF_RESULT"
      info "If fields were added, removed, or reordered, existing persistent storage entries"
      info "may not deserialise correctly. Review the migration doc: $MIGRATION_DOC"
    else
      pass "Struct fields match the previous snapshot"
    fi
  else
    warn "No struct snapshot at $STRUCT_SNAPSHOT — cannot diff field changes"
    info "Create the snapshot after this check passes using 'make snapshot-structs'"
  fi
fi

# ---------------------------------------------------------------------------
# Check 4 — Migration sequence doc
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 4: Migration sequence documentation ---"

if [[ -f "$MIGRATION_DOC" ]]; then
  pass "Migration doc found: $MIGRATION_DOC"

  # Verify required sections are present
  REQUIRED_SECTIONS=("Pre-migration" "Migration steps" "Post-migration" "Rollback")
  for SECTION in "${REQUIRED_SECTIONS[@]}"; do
    if grep -qi "## $SECTION" "$MIGRATION_DOC" 2>/dev/null; then
      pass "  Section present: '$SECTION'"
    else
      warn "  Missing section: '## $SECTION'"
      info "  Add this section to $MIGRATION_DOC"
    fi
  done
else
  # Only fail for mainnet; warn for testnet
  if [[ "$NETWORK" == "mainnet" ]]; then
    fail "Migration doc REQUIRED for mainnet upgrades: $MIGRATION_DOC"
    info "Create it from the template: cp docs/operations/migration-template.md $MIGRATION_DOC"
  else
    warn "No migration doc at $MIGRATION_DOC"
    info "This is acceptable for testnet but required before mainnet."
    info "Create one from: docs/operations/migration-template.md"
  fi
fi

# ---------------------------------------------------------------------------
# Check 5 — Rollback feasibility
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 5: Rollback feasibility ---"

if [[ -f "$DEPLOYMENT_LOG" ]]; then
  # Check that at least one recent entry exists for this contract
  if grep -qi "$CONTRACT" "$DEPLOYMENT_LOG" 2>/dev/null; then
    pass "Deployment log found and contains entries for '$CONTRACT'"
    info "Verify that the CURRENT contract ID is recorded before proceeding."
  else
    warn "Deployment log exists but has no entries for '$CONTRACT'"
    info "Record the current contract ID before upgrading so rollback is possible."
  fi
else
  fail "No deployment log found at $DEPLOYMENT_LOG"
  info "Create and populate it before upgrading. Rolling back requires the old contract ID."
  info "Template: docs/operations/deployment-log.md (see migration-template.md for structure)"
fi

# Check rollback section in the main deployment doc
if grep -qi "rollback" "docs/deployment.md" 2>/dev/null; then
  pass "Rollback procedures present in docs/deployment.md"
else
  warn "No 'rollback' section in docs/deployment.md"
fi

# ---------------------------------------------------------------------------
# Check 6 — Admin / initialise guard
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 6: Contract admin / initialise guard ---"

if [[ ! -f "$CONTRACT_SRC" ]]; then
  warn "Source not found — skipping admin check"
else
  # Look for an admin-check pattern
  if grep -q 'require_admin\|require_auth.*admin\|Admin.*require_auth' "$CONTRACT_SRC" 2>/dev/null; then
    pass "Admin authorisation guard found in contract source"
  else
    warn "No admin auth pattern found — confirm the contract has access control before deploying"
  fi

  # Check for initialise guard (prevent double-init)
  if grep -qE 'AlreadyInitialized|Already initialized|already_init' "$CONTRACT_SRC" 2>/dev/null; then
    pass "Double-initialise guard found"
  else
    warn "No double-initialise guard detected — verify the contract cannot be re-initialised"
  fi
fi

# ---------------------------------------------------------------------------
# Check 7 — Mainnet safety gate
# ---------------------------------------------------------------------------
echo ""
echo "--- Check 7: Network safety gate ---"

if [[ "$NETWORK" == "mainnet" ]]; then
  if [[ "$CONFIRM" != "--confirm" ]]; then
    fail "Mainnet deployment requires explicit confirmation."
    info "Re-run with --confirm once all other checks pass:"
    info "  $0 $CONTRACT $OLD_WASM $NEW_WASM mainnet --confirm"
  else
    pass "Mainnet confirmation flag present"
  fi
else
  pass "Network is '$NETWORK' — no confirmation gate"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "================================================================"
if [[ "$FAILED" -eq 0 ]]; then
  echo -e "${GREEN}ALL CHECKS PASSED — safe to proceed with deployment${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run the pre-deploy integration tests:"
  echo "     cd contracts/$CONTRACT && cargo test --release"
  echo "  2. Deploy: stellar contract deploy --wasm $NEW_WASM --source deployer --network $NETWORK"
  echo "  3. Record the new contract ID in $DEPLOYMENT_LOG"
  echo "  4. Update consumer configs to use the new contract ID"
  echo "  5. Run post-deploy verification: ./scripts/verify-deployment.sh $CONTRACT <new-id> $NETWORK"
  exit 0
else
  echo -e "${RED}$FAILED CHECK(S) FAILED — do NOT deploy until resolved${NC}"
  echo ""
  echo "Fix the failures above, then re-run this script."
  exit 1
fi
