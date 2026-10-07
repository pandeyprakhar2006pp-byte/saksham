/**
 * Centralized configuration for ESP32 Fingerprint Kiosks and Authentication
 */
export const DEFAULT_KIOSK_DEVICE_ID =
  process.env.NEXT_PUBLIC_KIOSK_DEVICE_ID || "kiosk-1"

export const KIOSK_POLL_INTERVAL_MS = 2000 // Poll every 2 seconds

export const KIOSK_TIMEOUT_SECONDS = 45 // 45 seconds timeout before fail state

export const KIOSK_MATCH_TTL_MS = 60 * 1000 // 60 seconds TTL for pending kiosk match

export const DEMO_OTP = "123456" // Default test OTP for manual login fallback
