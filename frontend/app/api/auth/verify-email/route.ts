import { NextRequest, NextResponse } from "next/server";

interface ChallengeRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory challenge store (keyed by email:challengeId)
const challengeStore = new Map<string, ChallengeRecord>();

// Cooldown tracker for challenge requests to prevent duplicate spam
const requestCooldowns = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, challengeId, code } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ACTION: REQUEST CHALLENGE
    if (action === "request") {
      const now = Date.now();
      const lastRequest = requestCooldowns.get(normalizedEmail) || 0;

      // Enforce 60-second cooldown per email
      if (now - lastRequest < 60000) {
        const waitSec = Math.ceil((60000 - (now - lastRequest)) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSec}s before requesting a new code.` },
          { status: 429 }
        );
      }

      // Generate secure 6-digit challenge code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newChallengeId = `chal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const key = `${normalizedEmail}:${newChallengeId}`;

      challengeStore.set(key, {
        code: generatedCode,
        expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
        attempts: 0,
      });

      requestCooldowns.set(normalizedEmail, now);

      return NextResponse.json({
        success: true,
        challengeId: newChallengeId,
        message: "Verification challenge dispatched.",
      });
    }

    // ACTION: VERIFY CHALLENGE
    if (action === "verify") {
      if (!challengeId || !code) {
        return NextResponse.json(
          { error: "Challenge ID and verification code are required." },
          { status: 400 }
        );
      }

      const key = `${normalizedEmail}:${challengeId}`;
      const record = challengeStore.get(key);

      if (!record) {
        return NextResponse.json(
          { error: "Verification session expired or invalid. Please request a new code." },
          { status: 404 }
        );
      }

      if (Date.now() > record.expiresAt) {
        challengeStore.delete(key);
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 410 }
        );
      }

      record.attempts += 1;
      if (record.attempts > 5) {
        challengeStore.delete(key);
        return NextResponse.json(
          { error: "Too many failed attempts. This code is invalidated. Request a new one." },
          { status: 429 }
        );
      }

      if (record.code !== code.trim()) {
        return NextResponse.json(
          { error: "Invalid verification code. Please check and try again." },
          { status: 400 }
        );
      }

      // Successful verification - clean up challenge
      challengeStore.delete(key);

      return NextResponse.json({
        success: true,
        verified: true,
        email: normalizedEmail,
        verifiedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process verification challenge." }, { status: 500 });
  }
}
