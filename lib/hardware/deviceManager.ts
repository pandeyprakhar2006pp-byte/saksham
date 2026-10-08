import { MockArduinoFingerprintAdapter } from "./mockAdapter"
import { WebSerialArduinoFingerprintAdapter } from "./webSerialAdapter"
import type {
  AdmissionVerificationResult,
  ArduinoDeviceConfig,
  ArduinoFingerprintAdapter,
  CandidateAdmissionState,
  DeviceConnectionStatus,
  DeviceStatusInfo,
  FingerprintVerificationResult,
} from "./types"

/**
 * ============================================================================
 * ARDUINO DEVICE MANAGER
 * ============================================================================
 * Manages active adapter selection (WebSerial vs Simulated Mock Mode),
 * hardware connectivity, and candidate two-tier admission verification.
 * ============================================================================
 */
export class ArduinoDeviceManager {
  private mockAdapter: MockArduinoFingerprintAdapter
  private webSerialAdapter: WebSerialArduinoFingerprintAdapter
  private currentAdapter: ArduinoFingerprintAdapter

  private listeners: Set<() => void> = new Set()

  constructor() {
    this.mockAdapter = new MockArduinoFingerprintAdapter()
    this.webSerialAdapter = new WebSerialArduinoFingerprintAdapter()
    // Default to mock adapter for initial load until operator explicitly connects physical hardware
    this.currentAdapter = this.mockAdapter
  }

  getAdapter(): ArduinoFingerprintAdapter {
    return this.currentAdapter
  }

  isSimulated(): boolean {
    return this.currentAdapter.isSimulated
  }

  getStatus(): DeviceStatusInfo {
    return this.currentAdapter.getStatus()
  }

  getMockAdapter(): MockArduinoFingerprintAdapter {
    return this.mockAdapter
  }

  setAdapterType(type: "web_serial" | "simulated"): void {
    if (type === "web_serial") {
      this.currentAdapter = this.webSerialAdapter
    } else {
      this.currentAdapter = this.mockAdapter
    }
    this.notify()
  }

  async connect(config?: Partial<ArduinoDeviceConfig>): Promise<{ success: boolean; error?: string }> {
    const result = await this.currentAdapter.connect(config)
    this.notify()
    return result
  }

  async disconnect(): Promise<void> {
    await this.currentAdapter.disconnect()
    this.notify()
  }

  /**
   * Two-Tier Admission Verification:
   * 1. Captures and checks fingerprint via the active Arduino adapter
   * 2. Calls backend (/api/hardware/verify) to verify candidate exam eligibility
   */
  async verifyAndAdmitCandidate(): Promise<AdmissionVerificationResult> {
    const scanResult: FingerprintVerificationResult = await this.currentAdapter.scanFingerprint()

    if (!scanResult.success || !scanResult.fingerprintTemplateId) {
      return {
        admitted: false,
        isSimulated: scanResult.isSimulated,
        error: scanResult.error || "Biometric authentication failed. No matching fingerprint template.",
        errorCode: scanResult.errorCode || "NOT_MATCHED",
      }
    }

    // Step 2: Validate exam eligibility in backend database
    try {
      const res = await fetch("/api/hardware/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprintTemplateId: scanResult.fingerprintTemplateId,
          isSimulated: scanResult.isSimulated,
          confidence: scanResult.confidence,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.admitted) {
        return {
          admitted: false,
          isSimulated: scanResult.isSimulated,
          error: data.message || "Candidate verification failed or exam eligibility expired.",
          errorCode: data.errorCode || "ELIGIBILITY_REJECTED",
          eligibilityStatus: data.eligibilityStatus,
        }
      }

      return {
        admitted: true,
        isSimulated: scanResult.isSimulated,
        candidate: data.candidate,
        sessionId: data.sessionId,
      }
    } catch (err: any) {
      return {
        admitted: false,
        isSimulated: scanResult.isSimulated,
        error: "Network error connecting to SAKSHAM exam admission server.",
        errorCode: "COMMUNICATION_ERROR",
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }
}

// Global client singleton
export const arduinoDeviceManager = new ArduinoDeviceManager()
