import { getProfileCompleteness, PROFILE_FIELDS } from "@/lib/profileCompleteness";

const VALID_KEY = "GAWZIBGIO2MM5AGBTCAUS4FCNFRYGCKKY3MAYE42BLHPTZVEL3K7LLGS";

describe("getProfileCompleteness (#911)", () => {
  it("groups missing fields by importance", () => {
    const status = getProfileCompleteness({});
    expect(status.missing.required.map((m) => m.field.id)).toEqual(["displayName", "stellarAccount"]);
    expect(status.missing.recommended.map((m) => m.field.id)).toEqual(["email"]);
    expect(status.missing.optional.map((m) => m.field.id)).toEqual(["bio"]);
    expect(status.canVerify).toBe(false);
    expect(status.completed).toBe(0);
    expect(status.percent).toBe(0);
  });

  it("treats whitespace-only values as empty", () => {
    const status = getProfileCompleteness({ displayName: "   " });
    expect(status.missing.required.find((m) => m.field.id === "displayName")?.reason).toBe("empty");
  });

  it("flags a malformed Stellar account as invalid rather than empty", () => {
    const status = getProfileCompleteness({ displayName: "Jane", stellarAccount: "not-a-key" });
    const item = status.missing.required.find((m) => m.field.id === "stellarAccount");
    expect(item?.reason).toBe("invalid");
    expect(status.canVerify).toBe(false);
  });

  it("reports verifiable once all required fields are valid", () => {
    const status = getProfileCompleteness({ displayName: "Jane", stellarAccount: VALID_KEY });
    expect(status.canVerify).toBe(true);
    expect(status.missing.required).toHaveLength(0);
    expect(status.missing.recommended.map((m) => m.field.id)).toEqual(["email"]);
  });

  it("reports 100% when every field is complete", () => {
    const status = getProfileCompleteness({
      displayName: "Jane",
      stellarAccount: VALID_KEY,
      email: "jane@example.com",
      bio: "Photographer",
    });
    expect(status.percent).toBe(100);
    expect(status.completed).toBe(PROFILE_FIELDS.length);
    expect(Object.values(status.missing).every((list) => list.length === 0)).toBe(true);
  });

  it("marks email as sensitive so the UI can label it", () => {
    const email = PROFILE_FIELDS.find((f) => f.id === "email");
    expect(email?.sensitive).toBe(true);
  });
});
