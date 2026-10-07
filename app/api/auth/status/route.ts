import { NextResponse } from "next/server"
import { kioskStore } from "@/lib/auth/kioskStore"
import { redisSession } from "@/lib/db/redis"
import { DEFAULT_KIOSK_DEVICE_ID } from "@/config/kiosk"

/**
 * GET /api/auth/status?deviceId=kiosk-1
 *
 * Polled by the SAKSHAM /login page every 2 seconds.
 * If a match has arrived from the ESP32 kiosk:
 * 1. Consumes the match (single-use, prevents replay).
 * 2. Initializes an authenticated Redis-backed session for the candidate.
 * 3. Returns { matched: true, sessionId, candidateName }.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId") || DEFAULT_KIOSK_DEVICE_ID

    // Check if the kiosk has recorded a match for this device
    const match = await kioskStore.consumeKioskMatch(deviceId)

    if (!match) {
      // Waiting for candidate to scan thumb
      return NextResponse.json({
        matched: false,
        deviceId,
        waiting: true,
      })
    }

    // Match found! Generate unique session ID and create session in Redis
    const sessionId = `saksham-session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    await redisSession.createSessionForCandidate(
      sessionId,
      match.candidateId,
      match.candidateName,
    )

    return NextResponse.json({
      matched: true,
      sessionId,
      candidateName: match.candidateName,
      candidateId: match.candidateId,
      deviceId,
    })
  } catch (error) {
    console.error("[/api/auth/status] Error polling kiosk status:", error)
    return NextResponse.json(
      { matched: false, error: "Internal server error polling authentication status." },
      { status: 500 },
    )
  }
}
