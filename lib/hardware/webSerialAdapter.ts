import type {
  ArduinoDeviceConfig,
  ArduinoFingerprintAdapter,
  DeviceConnectionStatus,
  DeviceStatusInfo,
  FingerprintVerificationResult,
} from "./types"

/**
 * ============================================================================
 * REAL ARDUINO FINGERPRINT ADAPTER (WEB SERIAL API)
 * ============================================================================
 *
 * Connects directly to a physical Arduino board (Uno, Nano, Mega, ESP32, etc.)
 * communicating with an optical fingerprint sensor (e.g. Adafruit Optical
 * Fingerprint Sensor, R307, AS608, FPM10A) via the W3C Web Serial API.
 *
 * Communication Protocol:
 * Arduino sketch runs standard optical sensor firmware (e.g., Adafruit_Fingerprint
 * library) and outputs line-delimited serial packets:
 * - Handshake: "ARDUINO_FP_READY:R307:57600"
 * - Match Event: "MATCH:<templateId>:<confidence>"
 * - Mismatch: "NO_MATCH"
 * - Error: "ERROR:<code_or_message>"
 * ============================================================================
 */
export class WebSerialArduinoFingerprintAdapter implements ArduinoFingerprintAdapter {
  id = "arduino-web-serial"
  name = "Physical Arduino Optical Reader (Web Serial USB)"
  isSimulated = false

  private status: DeviceConnectionStatus = "disconnected"
  private port: any = null
  private reader: any = null
  private writer: any = null
  private baudRate = 57600
  private portName = "USB Serial"
  private sensorModel = "Optical Prism R307 / AS608"
  private lastPing?: string
  private errorMessage?: string

  isHardwareAvailable(): boolean {
    return typeof window !== "undefined" && "serial" in navigator
  }

  async connect(config?: Partial<ArduinoDeviceConfig>): Promise<{ success: boolean; error?: string }> {
    if (!this.isHardwareAvailable()) {
      this.status = "error"
      this.errorMessage = "Web Serial API is not supported in this browser. Please use Chrome or Edge."
      return { success: false, error: this.errorMessage }
    }

    try {
      this.status = "connecting"
      this.errorMessage = undefined
      this.baudRate = config?.baudRate || 57600

      // Prompt operator to select the USB Serial port for the Arduino
      const navSerial = (navigator as any).serial
      this.port = await navSerial.requestPort()

      if (!this.port) {
        this.status = "disconnected"
        return { success: false, error: "No serial port selected by operator." }
      }

      // Open connection to Arduino
      await this.port.open({ baudRate: this.baudRate })

      // Extract port info if available
      const info = this.port.getInfo?.()
      if (info?.usbVendorId) {
        this.portName = `USB VID:0x${info.usbVendorId.toString(16).padStart(4, "0")} PID:0x${(info.usbProductId || 0).toString(16).padStart(4, "0")}`
      }

      this.status = "ready"
      this.lastPing = new Date().toISOString()
      return { success: true }
    } catch (err: any) {
      this.status = "error"
      if (err?.name === "NotFoundError") {
        this.errorMessage = "Operator cancelled port selection."
      } else {
        this.errorMessage = err?.message || "Failed to open serial connection with Arduino."
      }
      return { success: false, error: this.errorMessage }
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {})
        this.reader = null
      }
      if (this.port) {
        await this.port.close().catch(() => {})
        this.port = null
      }
    } finally {
      this.status = "disconnected"
      this.errorMessage = undefined
      this.lastPing = undefined
    }
  }

  getStatus(): DeviceStatusInfo {
    return {
      status: this.status,
      isSimulated: false,
      adapterName: this.name,
      baudRate: this.baudRate,
      portName: this.port ? this.portName : undefined,
      sensorModel: this.sensorModel,
      lastPing: this.lastPing,
      error: this.errorMessage,
    }
  }

  async scanFingerprint(): Promise<FingerprintVerificationResult> {
    if (this.status !== "ready" || !this.port) {
      return {
        success: false,
        isSimulated: false,
        error: "Physical Arduino reader is not connected.",
        errorCode: "COMMUNICATION_ERROR",
      }
    }

    try {
      // Optional: Send capture command trigger 'C\n' to Arduino
      if (this.port.writable) {
        const textEncoder = new TextEncoder()
        this.writer = this.port.writable.getWriter()
        await this.writer.write(textEncoder.encode("SCAN\n"))
        this.writer.releaseLock()
        this.writer = null
      }

      // Read serial response with timeout
      const textDecoder = new TextDecoder()
      this.reader = this.port.readable.getReader()

      let accumulated = ""
      const timeoutMs = 15000 // 15 seconds to place finger
      const startTime = Date.now()

      while (Date.now() - startTime < timeoutMs) {
        const { value, done } = await Promise.race([
          this.reader.read(),
          new Promise<{ value: undefined; done: true }>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 1000),
          ).catch(() => ({ value: undefined, done: false })),
        ])

        if (done) break

        if (value) {
          accumulated += textDecoder.decode(value, { stream: true })
          const lines = accumulated.split("\n")

          for (const line of lines) {
            const trimmed = line.trim()

            // Protocol Match packet: MATCH:<templateId>:<confidence>
            if (trimmed.startsWith("MATCH:")) {
              const [, templateIdStr, confStr] = trimmed.split(":")
              const templateId = parseInt(templateIdStr, 10)
              const confidence = confStr ? parseInt(confStr, 10) : 95

              await this.reader.cancel().catch(() => {})
              this.reader = null

              return {
                success: true,
                isSimulated: false,
                fingerprintTemplateId: isNaN(templateId) ? templateIdStr : templateId,
                confidence: isNaN(confidence) ? 95 : confidence,
              }
            }

            if (trimmed === "NO_MATCH") {
              await this.reader.cancel().catch(() => {})
              this.reader = null

              return {
                success: false,
                isSimulated: false,
                error: "Fingerprint does not match any registered template in sensor database.",
                errorCode: "NOT_MATCHED",
              }
            }

            if (trimmed.startsWith("ERROR:")) {
              await this.reader.cancel().catch(() => {})
              this.reader = null

              return {
                success: false,
                isSimulated: false,
                error: `Arduino sensor error: ${trimmed.substring(6)}`,
                errorCode: "SENSOR_ERROR",
              }
            }
          }
        }
      }

      await this.reader.cancel().catch(() => {})
      this.reader = null

      return {
        success: false,
        isSimulated: false,
        error: "Sensor optical timeout: no finger detected within 15 seconds.",
        errorCode: "DEVICE_TIMEOUT",
      }
    } catch (err: any) {
      if (this.reader) {
        await this.reader.cancel().catch(() => {})
        this.reader = null
      }
      return {
        success: false,
        isSimulated: false,
        error: err?.message || "Serial communication interrupted during fingerprint scan.",
        errorCode: "COMMUNICATION_ERROR",
      }
    }
  }
}
