import { KIOSK_MATCH_TTL_MS } from "@/config/kiosk"

export interface KioskMatchRecord {
  deviceId: string
  fingerprintId: number
  candidateId: string
  candidateName: string
  matchedAt: number
  expiresAt: number
}

/**
 * ============================================================================
 * SHARED KIOSK SESSION STORE
 * ============================================================================
 * Bridges the asynchronous ESP32 fingerprint scan (POST /api/auth/fingerprint)
 * with the browser client polling (GET /api/auth/status?deviceId=...).
 *
 * In-memory Map implementation for demo/local testing.
 *
 * PRODUCTION NOTE:
 * To scale across multiple serverless Next.js instances, swap the internal
 * calls below to Redis:
 * - recordKioskMatch -> await redis.set(`kiosk:${deviceId}`, JSON.stringify(record), 'EX', 60)
 * - consumeKioskMatch -> await redis.getdel(`kiosk:${deviceId}`)
 * ============================================================================
 */
class KioskSessionStore {
  private matches: Map<string, KioskMatchRecord> = new Map()

  /**
   * Records a matched fingerprint event from an ESP32 kiosk
   */
  async recordKioskMatch(params: {
    deviceId: string
    fingerprintId: number
    candidateId: string
    candidateName: string
  }): Promise<KioskMatchRecord> {
    const now = Date.now()
    const record: KioskMatchRecord = {
      deviceId: params.deviceId,
      fingerprintId: params.fingerprintId,
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      matchedAt: now,
      expiresAt: now + KIOSK_MATCH_TTL_MS,
    }

    this.matches.set(params.deviceId, record)
    return record
  }

  /**
   * Consumes a match for a deviceId.
   * Returns the match record and removes it immediately so it cannot be replayed.
   */
  async consumeKioskMatch(deviceId: string): Promise<KioskMatchRecord | null> {
    const record = this.matches.get(deviceId)
    if (!record) return null

    // Check expiration
    if (Date.now() > record.expiresAt) {
      this.matches.delete(deviceId)
      return null
    }

    // Single-use: Consume and remove so the token cannot be reused
    this.matches.delete(deviceId)
    return record
  }

  /**
   * Checks if an active unexpired match exists without consuming it
   */
  async peekKioskMatch(deviceId: string): Promise<KioskMatchRecord | null> {
    const record = this.matches.get(deviceId)
    if (!record) return null
    if (Date.now() > record.expiresAt) {
      this.matches.delete(deviceId)
      return null
    }
    return record
  }

  /**
   * Explicitly clears any match for a device
   */
  async clearKioskMatch(deviceId: string): Promise<void> {
    this.matches.delete(deviceId)
  }
}

export const kioskStore = new KioskSessionStore()
