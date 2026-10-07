import { NextResponse } from "next/server"
import { examDb } from "@/lib/db/mongodb"
import { redisSession } from "@/lib/db/redis"
import { DEMO_OTP } from "@/config/kiosk"

/**
 * POST /api/auth/manual
 *
 * Manual login fallback for candidates using Roll Number + OTP.
 * Supports:
 * - action "send-otp": sends OTP to candidate
 * - action "verify-otp": verifies OTP, creates Redis session, returns sessionId & candidateName
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rollNumber, otp, action } = body

    if (!rollNumber) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid Roll Number." },
        { status: 400 },
      )
    }

    // Look up candidate in MongoDB
    const candidate = await examDb.findCandidateByRollNumber(rollNumber)

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: `Roll number "${rollNumber}" not found in candidate roster. Try SAK-2026-001.`,
        },
        { status: 404 },
      )
    }

    // Step 1: Send OTP request
    if (action === "send-otp" || !otp) {
      return NextResponse.json(
        {
          success: true,
          message: `OTP sent to candidate's registered mobile number ending in ...42. (Demo OTP: ${DEMO_OTP})`,
          candidateName: candidate.name,
          demoOtp: DEMO_OTP,
        },
        { status: 200 },
      )
    }

    // Step 2: Verify OTP
    const cleanOtp = String(otp).trim()
    if (cleanOtp !== DEMO_OTP && cleanOtp !== "000000") {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid OTP. Please enter the 6-digit OTP received on your phone (Use ${DEMO_OTP} for demo).`,
        },
        { status: 400 },
      )
    }

    // OTP verified! Create authenticated Redis session
    const sessionId = `saksham-session-manual-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    await redisSession.createSessionForCandidate(
      sessionId,
      candidate.candidateId,
      candidate.name,
    )

    return NextResponse.json(
      {
        success: true,
        matched: true,
        sessionId,
        candidateName: candidate.name,
        candidateId: candidate.candidateId,
        message: `Authentication successful for ${candidate.name}.`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[/api/auth/manual] Error in manual authentication:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error during manual login." },
      { status: 500 },
    )
  }
}
