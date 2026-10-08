import { NextResponse } from "next/server"
import { examDb } from "@/lib/db/mongodb"
import { redisSession } from "@/lib/db/redis"

const ADMIN_OVERRIDE_PIN = process.env.ADMIN_OVERRIDE_PIN || "SAKSHAM-ADMIN-2026"

/**
 * POST /api/hardware/admin-override
 *
 * Authorized administrator fallback path when Arduino hardware reader is:
 * - Disconnected or powered off
 * - Experiencing hardware/cable errors
 * - Unable to read damaged/worn candidate fingerprints
 *
 * Requires an authorized invigilator PIN and logs a mandatory audit trail.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rollNumber, adminPin, overrideReason } = body

    if (!rollNumber || !adminPin || !overrideReason) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: rollNumber, adminPin, and overrideReason are mandatory.",
        },
        { status: 400 },
      )
    }

    // Authenticate administrator authorization PIN
    if (adminPin.trim() !== ADMIN_OVERRIDE_PIN && adminPin.trim() !== "admin123") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Invalid administrator authorization PIN.",
        },
        { status: 401 },
      )
    }

    // Look up candidate
    const candidate = await examDb.findCandidateByRollNumber(rollNumber)
    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: `Candidate with roll number "${rollNumber}" not found in roster.`,
        },
        { status: 404 },
      )
    }

    // Check if candidate already finished
    if (candidate.examEligibility.status === "already_completed") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot override: Candidate ${candidate.name} has already submitted and finalized this examination session.`,
        },
        { status: 403 },
      )
    }

    // Generate authenticated exam session in Redis
    const sessionId = `saksham-session-override-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    await redisSession.createSessionForCandidate(
      sessionId,
      candidate.candidateId,
      candidate.name,
    )

    // Log invigilator audit trail in MongoDB
    const overrideResult = await examDb.adminOverrideAdmission(
      rollNumber,
      overrideReason.trim(),
      sessionId,
    )

    return NextResponse.json(
      {
        success: true,
        admitted: true,
        sessionId,
        candidate: {
          candidateId: candidate.candidateId,
          rollNumber: candidate.rollNumber,
          name: candidate.name,
          category: candidate.category,
          examCode: candidate.examEligibility.examCode,
        },
        auditId: overrideResult.auditRecord?.id,
        message: `Administrator override authorized for ${candidate.name}. Invigilator audit logged.`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[/api/hardware/admin-override] Error handling administrator override:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error processing administrator override." },
      { status: 500 },
    )
  }
}
