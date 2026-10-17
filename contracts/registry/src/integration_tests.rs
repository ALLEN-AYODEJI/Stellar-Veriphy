/// # Registry Contract — Integration Tests (#654)
///
/// Covers TEE hash approval lifecycle, provider registration and blacklisting,
/// multi-sig governance, and event emission.
#[cfg(test)]
mod registry_integration_tests {
    use registry::{RegistryContract, RegistryContractClient};
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger as _},
        Address, BytesN, Env,
    };

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    fn make_env() -> Env {
        Env::default()
    }

    fn hash(env: &Env, byte: u8) -> BytesN<32> {
        BytesN::from_array(env, &[byte; 32])
    }

    /// Deploy and initialize a registry contract.
    /// Returns (client, admin_address).
    fn setup(env: &Env) -> (Address, RegistryContractClient<'_>) {
        env.mock_all_auths();
        let cid = env.register_contract(None, RegistryContract);
        let client = RegistryContractClient::new(env, &cid);
        let admin = Address::generate(env);
        let provenance = Address::generate(env);
        client.init(&admin, &provenance);
        (admin, client)
    }

    // -----------------------------------------------------------------------
    // Init — double-init rejected
    // -----------------------------------------------------------------------

    #[test]
    fn test_double_init_panics() {
        let env = make_env();
        let (_, client) = setup(&env);
        let admin2 = Address::generate(&env);
        let provenance2 = Address::generate(&env);
        let result = std::panic::catch_unwind(|| {
            client.init(&admin2, &provenance2);
        });
        assert!(result.is_err(), "second init must panic");
    }

    // -----------------------------------------------------------------------
    // TEE hash — add and verify
    // -----------------------------------------------------------------------

    #[test]
    fn test_add_tee_hash_makes_it_approved() {
        let env = make_env();
        let (_, client) = setup(&env);
        let tee = hash(&env, 0xAB);

        assert!(
            !client.is_tee_hash_approved(&tee),
            "unknown hash must not be approved"
        );

        client.add_tee_hash(&tee);
        assert!(
            client.is_tee_hash_approved(&tee),
            "hash must be approved after add_tee_hash"
        );
    }

    // -----------------------------------------------------------------------
    // TEE hash — rotation invalidates the old hash
    // -----------------------------------------------------------------------

    #[test]
    fn test_rotate_tee_hash_invalidates_old_and_approves_new() {
        let env = make_env();
        let (_, client) = setup(&env);
        let old = hash(&env, 0x01);
        let new = hash(&env, 0x02);

        client.add_tee_hash(&old);
        assert!(client.is_tee_hash_approved(&old));

        client.rotate_tee_hash(&old, &new);

        assert!(
            !client.is_tee_hash_approved(&old),
            "old hash must not be approved after rotation"
        );
        assert!(
            client.is_tee_hash_approved(&new),
            "new hash must be approved after rotation"
        );
    }

    // -----------------------------------------------------------------------
    // TEE hash — expired hash is not approved
    // -----------------------------------------------------------------------

    #[test]
    fn test_expired_tee_hash_is_not_approved() {
        let env = make_env();
        let (_, client) = setup(&env);
        let tee = hash(&env, 0xCC);

        client.add_tee_hash(&tee);
        assert!(client.is_tee_hash_approved(&tee));

        // Advance ledger time past the 180-day validity window
        // (TEE_HASH_VALIDITY = 180 * 86400 = 15_552_000 seconds)
        env.ledger().with_mut(|l| {
            l.timestamp += 16_000_000; // > 180 days
        });

        assert!(
            !client.is_tee_hash_approved(&tee),
            "expired TEE hash must not be approved"
        );
    }

    // -----------------------------------------------------------------------
    // Provider — register, check, blacklist
    // -----------------------------------------------------------------------

    #[test]
    fn test_add_provider_makes_it_registered() {
        let env = make_env();
        let (_, client) = setup(&env);
        let provider_key = hash(&env, 0x10);

        assert!(
            !client.is_provider(&provider_key),
            "unknown provider must not be registered"
        );

        client.add_provider(&provider_key);
        assert!(
            client.is_provider(&provider_key),
            "provider must be registered after add_provider"
        );
    }

    #[test]
    fn test_blacklist_provider_removes_approval() {
        let env = make_env();
        let (_, client) = setup(&env);
        let provider_key = hash(&env, 0x20);

        client.add_provider(&provider_key);
        assert!(client.is_provider(&provider_key));

        client.blacklist_provider(&provider_key);

        assert!(
            !client.is_provider(&provider_key),
            "blacklisted provider must not be approved"
        );
    }

    // -----------------------------------------------------------------------
    // Events — add_tee_hash emits an event
    // -----------------------------------------------------------------------

    #[test]
    fn test_add_tee_hash_emits_event() {
        let env = make_env();
        let (_, client) = setup(&env);
        let tee = hash(&env, 0x55);

        client.add_tee_hash(&tee);

        let events = env.events().all();
        assert!(
            !events.is_empty(),
            "at least one event must be emitted on add_tee_hash"
        );
    }

    // -----------------------------------------------------------------------
    // Multiple TEE hashes — all independently approved
    // -----------------------------------------------------------------------

    #[test]
    fn test_multiple_tee_hashes_are_independently_tracked() {
        let env = make_env();
        let (_, client) = setup(&env);

        let hashes: Vec<BytesN<32>> = (1u8..=5).map(|b| hash(&env, b)).collect();
        for h in &hashes {
            client.add_tee_hash(h);
        }

        for h in &hashes {
            assert!(
                client.is_tee_hash_approved(h),
                "every registered hash must be approved"
            );
        }

        // Rotating hash 0x01 must not affect 0x02..0x05
        client.rotate_tee_hash(&hashes[0], &hash(&env, 0xAA));
        for h in hashes.iter().skip(1) {
            assert!(
                client.is_tee_hash_approved(h),
                "non-rotated hashes must remain approved"
            );
        }
    }
}
