import type {
  ArduinoDeviceConfig,
  ArduinoFingerprintAdapter,
  DeviceConnectionStatus,
  DeviceStatusInfo,
  FingerprintVerificationResult,
} from "./types"

/**
 * ============================================================================
 * MOCK ARDUINO FINGERPRINT ADAPTER (DEMO MODE)
 * ============================================================================
 *
 * Clearly labeled mock implementation for environments where a physical
 * Arduino board with an optical fingerprint sensor (e.g., Adafruit R307,
 * AS608, or FPM10A) is not physically plugged in or configured.
 *
 * IMPORTANT TRANSPARENCY NOTICE:
 * This adapter explicitly returns `isSimulated: true` on all calls.
 * It does NOT perform real cryptographic biometric matching, and does NOT
 * claim real fingerprint verification.
 * ============================================================================
 */
export class MockArduinoFingerprintAdapter implements ArduinoFingerprintAdapter {
  id = "mock-arduino-demo"
  name = "Simulated Arduino Reader (Demo Mode)"
  isSimulated = true

  private status: DeviceConnectionStatus = "disconnected"
  private baudRate = 57600
  private lastPing?: string
  private errorMessage?: string
  private mockScenario: "success_candidate_1" | "success_candidate_2" | "ineligible_candidate" | "unregistered_finger" | "sensor_error" = "success_candidate_1"

  setMockScenario(scenario: "success_candidate_1" | "success_candidate_2" | "ineligible_candidate" | "unregistered_finger" | "sensor_error") {
    this.mockScenario = scenario
  }

  async connect(config?: Partial<ArduinoDeviceConfig>): Promise<{ success: boolean; error?: string }> {
    this.status = "connecting"
    this.errorMessage = undefined

    // Simulate serial handshake latency with Arduino bootloader
    await new Promise((resolve) => setTimeout(resolve, 800))

    this.status = "ready"
    this.baudRate = config?.baudRate || 57600
    this.lastPing = new Date().toISOString()
    return { success: true }
  }

  async disconnect(): Promise<void> {
    this.status = "disconnected"
    this.lastPing = undefined
    this.errorMessage = undefined
  }

  getStatus(): DeviceStatusInfo {
    return {
      status: this.status,
      isSimulated: true,
      adapterName: this.name,
      baudRate: this.baudRate,
      portName: "COM-VIRTUAL (Emulated Serial)",
      sensorModel: "Optical R307 Sensor (Emulated via Mock Adapter)",
      lastPing: this.lastPing,
      error: this.errorMessage,
    }
  }

  async scanFingerprint(): Promise<FingerprintVerificationResult> {
    if (this.status !== "ready") {
      return {
        success: false,
        isSimulated: true,
        error: "Device is not in ready state. Please connect the Arduino reader first.",
        errorCode: "COMMUNICATION_ERROR",
      }
    }

    // Simulate optical scan latency (image capture -> minutiae extraction -> search)
    await new Promise((resolve) => setTimeout(resolve, 1200))

    switch (this.mockScenario) {
      case "success_candidate_1":
        return {
          success: true,
          isSimulated: true,
          fingerprintTemplateId: 101, // Dynamic template ID corresponding to registered eligible candidate
          confidence: 97,
        }

      case "success_candidate_2":
        return {
          success: true,
          isSimulated: true,
          fingerprintTemplateId: 102, // Another registered eligible candidate
          confidence: 94,
        }

      case "ineligible_candidate":
        // Biometric matches an enrolled candidate, BUT that candidate is flagged ineligible in database
        return {
          success: true,
          isSimulated: true,
          fingerprintTemplateId: 103, // Ineligible candidate (already completed or slot expired)
          confidence: 96,
        }

      case "unregistered_finger":
        return {
          success: false,
          isSimulated: true,
          error: "Fingerprint image captured, but no matching minutiae template found in local sensor flash memory.",
          errorCode: "NOT_MATCHED",
        }

      case "sensor_error":
        return {
          success: false,
          isSimulated: true,
          error: "Sensor optical prism timed out or finger removed prematurely.",
          errorCode: "DEVICE_TIMEOUT",
        }
    }
  }

  isHardwareAvailable(): boolean {
    return true // Always available as a fallback
  }
}
