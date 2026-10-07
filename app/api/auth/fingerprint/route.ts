import { NextResponse } from "next/server"
import { examDb } from "@/lib/db/mongodb"
import { kioskStore } from "@/lib/auth/kioskStore"
import { DEFAULT_KIOSK_DEVICE_ID } from "@/config/kiosk"

/**
 * POST /api/auth/fingerprint
 *
 * Endpoint called by the ESP32 IoT biometric kiosk when a candidate places
 * their thumb on the fingerprint sensor.
 *
 * Request Body:
 * {
 *   "fingerprintId": 1,
 *   "deviceId": "kiosk-1"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fingerprintId, deviceId = DEFAULT_KIOSK_DEVICE_ID } = body

    if (fingerprintId === undefined || fingerprintId === null) {
      return NextResponse.json(
        { success: false, message: "Missing required field: fingerprintId" },
        { status: 400 },
      )
    }

    // Look up candidate in MongoDB by matched fingerprint ID
    const candidate = await examDb.findCandidateByFingerprintId(fingerprintId)

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          matched: false,
          message: `Fingerprint ID #${fingerprintId} is not registered in the SAKSHAM candidate database.`,
        },
        { status: 404 },
      )
    }

    // Record the match in the shared kiosk store for polling consumption
    await kioskStore.recordKioskMatch({
      deviceId,
      fingerprintId: candidate.fingerprintId,
      candidateId: candidate.candidateId,
      candidateName: candidate.name,
    })

    return NextResponse.json(
      {
        success: true,
        matched: true,
        candidateName: candidate.name,
        candidateId: candidate.candidateId,
        deviceId,
        message: `Thumb match confirmed for ${candidate.name}.`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[/api/auth/fingerprint] Error processing kiosk thumb scan:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error processing thumb scan." },
      { status: 500 },
    )
  }
}
