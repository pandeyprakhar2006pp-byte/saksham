import { NextResponse } from "next/server"
import { examDb } from "@/lib/db/mongodb"
import { redisSession } from "@/lib/db/redis"

/**
 * POST /api/hardware/verify
 *
 * Two-Tier Admission Verification:
 * 1. Validates biometric fingerprint minutiae template against enrolled database.
 * 2. Confirms active exam eligibility (enrolled, active slot window, not completed).
 *
 * A candidate is admitted ONLY if both biometric and exam eligibility pass.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fingerprintTemplateId, isSimulated = false, confidence } = body

    if (fingerprintTemplateId === undefined || fingerprintTemplateId === null) {
      return NextResponse.json(
        { admitted: false, message: "Missing required field: fingerprintTemplateId", errorCode: "INVALID_REQUEST" },
        { status: 400 },
      )
    }

    // Two-tier verification in MongoDB
    const result = await examDb.verifyCandidateAdmission(fingerprintTemplateId)

    // Tier 1 Failure: Biometric template not enrolled
    if (!result.matched || !result.candidate) {
      return NextResponse.json(
        {
          admitted: false,
          isSimulated,
          message: result.reason || "Fingerprint minutiae template not recognized in candidate registry.",
          errorCode: "NOT_MATCHED",
          eligibilityStatus: "not_registered",
        },
        { status: 404 },
      )
    }

    // Tier 2 Failure: Candidate is enrolled, but NOT eligible for exam
    if (!result.isEligible) {
      return NextResponse.json(
        {
          admitted: false,
          isSimulated,
          candidateName: result.candidate.name,
          rollNumber: result.candidate.rollNumber,
          message: result.reason || "Candidate is not eligible to take this exam.",
          errorCode: "ELIGIBILITY_REJECTED",
          eligibilityStatus: result.eligibilityStatus,
        },
        { status: 403 },
      )
    }

    // Both tiers passed! Create authenticated Redis exam session
    const sessionId = `saksham-session-arduino-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    await redisSession.createSessionForCandidate(
      sessionId,
      result.candidate.candidateId,
      result.candidate.name,
    )

    return NextResponse.json(
      {
        admitted: true,
        isSimulated,
        confidence: confidence ?? (isSimulated ? 95 : 98),
        sessionId,
        candidate: {
          candidateId: result.candidate.candidateId,
          rollNumber: result.candidate.rollNumber,
          name: result.candidate.name,
          category: result.candidate.category,
          examCode: result.candidate.examEligibility.examCode,
        },
        message: `Biometric verified and exam eligibility confirmed for ${result.candidate.name}.`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[/api/hardware/verify] Error in admission verification:", error)
    return NextResponse.json(
      { admitted: false, message: "Internal server error during biometric admission check." },
      { status: 500 },
    )
  }
}
