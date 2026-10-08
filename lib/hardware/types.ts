/**
 * ============================================================================
 * SAKSHAM ARDUINO FINGERPRINT READER - HARDWARE TYPES & CONTRACTS
 * ============================================================================
 */

export type DeviceConnectionStatus = "disconnected" | "connecting" | "ready" | "error"

export type CandidateAdmissionState =
  | "disconnected"
  | "connecting"
  | "ready"
  | "verifying"
  | "verification_failed"
  | "verified"

export interface ArduinoDeviceConfig {
  baudRate: number
  protocol: "web_serial" | "simulated"
  deviceId: string
  timeoutMs: number
}

export type HardwareErrorCode =
  | "NO_FINGER"
  | "NOT_MATCHED"
  | "DEVICE_TIMEOUT"
  | "SENSOR_ERROR"
  | "COMMUNICATION_ERROR"
  | "UNSUPPORTED_BROWSER"
  | "PORT_IN_USE"
  | "USER_CANCELLED"

export interface FingerprintVerificationResult {
  success: boolean
  isSimulated: boolean
  fingerprintTemplateId?: string | number
  confidence?: number
  error?: string
  errorCode?: HardwareErrorCode
}

export interface ExamEligibilityResult {
  isEligible: boolean
  candidateId?: string
  candidateName?: string
  rollNumber?: string
  examCode?: string
  status: "eligible" | "already_completed" | "slot_expired" | "not_registered"
  reason?: string
}

export interface AdmissionVerificationResult {
  admitted: boolean
  isSimulated: boolean
  candidate?: {
    candidateId: string
    rollNumber: string
    name: string
    category: string
    examCode: string
  }
  sessionId?: string
  error?: string
  errorCode?: string
  eligibilityStatus?: "eligible" | "already_completed" | "slot_expired" | "not_registered"
}

export interface DeviceStatusInfo {
  status: DeviceConnectionStatus
  isSimulated: boolean
  adapterName: string
  baudRate: number
  portName?: string
  sensorModel: string
  lastPing?: string
  error?: string
}

export interface ArduinoFingerprintAdapter {
  id: string
  name: string
  isSimulated: boolean
  connect(config?: Partial<ArduinoDeviceConfig>): Promise<{ success: boolean; error?: string }>
  disconnect(): Promise<void>
  getStatus(): DeviceStatusInfo
  scanFingerprint(): Promise<FingerprintVerificationResult>
  isHardwareAvailable(): boolean
}
