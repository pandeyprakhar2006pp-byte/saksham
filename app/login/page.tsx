"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AccessibilityBar } from "@/components/AccessibilityBar"
import {
  DEFAULT_KIOSK_DEVICE_ID,
  KIOSK_POLL_INTERVAL_MS,
  KIOSK_TIMEOUT_SECONDS,
  DEMO_OTP,
} from "@/config/kiosk"
import {
  CheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ReplayIcon,
  KeyboardIcon,
  ShieldIcon,
} from "@/components/ui/icons"
import styles from "./login.module.css"

type LoginUIState = "WAITING" | "SUCCESS" | "FAIL" | "MANUAL"

export default function LoginPage() {
  const router = useRouter()

  // Main UI State: "WAITING" (default) | "SUCCESS" | "FAIL" | "MANUAL"
  const [uiState, setUiState] = useState<LoginUIState>("WAITING")

  // Authentication & Session data
  const [candidateName, setCandidateName] = useState<string>("")
  const [sessionId, setSessionId] = useState<string>("")
  const [secondsRemaining, setSecondsRemaining] = useState<number>(KIOSK_TIMEOUT_SECONDS)
  const [announcement, setAnnouncement] = useState<string>(
    "Place your thumb on the scanner. Waiting for kiosk to read your fingerprint.",
  )

  // Manual fallback form state
  const [rollNumber, setRollNumber] = useState<string>("SAK-2026-001")
  const [otp, setOtp] = useState<string>("")
  const [otpSent, setOtpSent] = useState<boolean>(false)
  const [manualLoading, setManualLoading] = useState<boolean>(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null)

  // Polling ref
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── 1. Background Polling: GET /api/auth/status?deviceId=... ───────────────
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/status?deviceId=${encodeURIComponent(DEFAULT_KIOSK_DEVICE_ID)}`, {
        cache: "no-store",
      })

      if (!res.ok) {
        // Tolerates patchy network; will retry on next tick
        return
      }

      const data = await res.json()

      if (data.matched && data.sessionId && data.candidateName) {
        // Success match arrived from ESP32 kiosk!
        setCandidateName(data.candidateName)
        setSessionId(data.sessionId)
        setUiState("SUCCESS")
        setAnnouncement(`Welcome, ${data.candidateName}. Fingerprint verified. Starting your exam.`)
      }
    } catch {
      // Gracefully ignore fetch network drops; retries on next tick
    }
  }, [])

  // ── 2. Polling Lifecycle & 45s Countdown in WAITING state ───────────────────
  useEffect(() => {
    if (uiState !== "WAITING") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      return
    }

    // Reset countdown
    setSecondsRemaining(KIOSK_TIMEOUT_SECONDS)
    setAnnouncement("Place your thumb on the scanner. Waiting for kiosk to read your fingerprint.")

    // Poll every 2 seconds
    pollTimerRef.current = setInterval(() => {
      pollStatus()
    }, KIOSK_POLL_INTERVAL_MS)

    // Initial check immediately on mount
    pollStatus()

    // 45s countdown timer
    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timeout reached: Switch to FAIL state
          setUiState("FAIL")
          setAnnouncement("No scan detected after 45 seconds. Try again or use roll number.")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [uiState, pollStatus])

  // ── 3. Auto-Redirect in SUCCESS state ───────────────────────────────────────
  useEffect(() => {
    if (uiState !== "SUCCESS" || !sessionId) return

    const redirectTimer = setTimeout(() => {
      router.push(`/exam?sessionId=${encodeURIComponent(sessionId)}`)
    }, 1500)

    return () => clearTimeout(redirectTimer)
  }, [uiState, sessionId, router])

  // ── 4. Manual Login Handlers (Roll Number + OTP) ───────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!rollNumber.trim()) {
      setManualError("Please enter your roll number.")
      return
    }

    setManualLoading(true)
    setManualError(null)

    try {
      const res = await fetch("/api/auth/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp", rollNumber: rollNumber.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setManualError(data.message || "Could not find roll number.")
      } else {
        setOtpSent(true)
        setDemoOtpHint(data.demoOtp || DEMO_OTP)
        setAnnouncement(`OTP sent for ${data.candidateName}. Enter 6-digit OTP.`)
      }
    } catch {
      setManualError("Network error sending OTP. Please try again.")
    } finally {
      setManualLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otp.trim()) {
      setManualError("Please enter the 6-digit OTP.")
      return
    }

    setManualLoading(true)
    setManualError(null)

    try {
      const res = await fetch("/api/auth/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-otp",
          rollNumber: rollNumber.trim(),
          otp: otp.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setManualError(data.message || "Invalid OTP. Please check and try again.")
      } else {
        setCandidateName(data.candidateName)
        setSessionId(data.sessionId)
        setUiState("SUCCESS")
        setAnnouncement(`Welcome, ${data.candidateName}. Authentication verified. Starting your exam.`)
      }
    } catch {
      setManualError("Network error verifying OTP. Please try again.")
    } finally {
      setManualLoading(false)
    }
  }

  // ── 5. Dev Kiosk Simulator Trigger ─────────────────────────────────────────
  async function simulateKioskScan(fingerprintId: number) {
    try {
      await fetch("/api/auth/fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprintId,
          deviceId: DEFAULT_KIOSK_DEVICE_ID,
        }),
      })
      // Trigger instant poll
      pollStatus()
    } catch (err) {
      console.error("Simulation error:", err)
    }
  }

  return (
    <>
      <AccessibilityBar />

      <div className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        {/* Screen Reader Announcement Live Region */}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* Header */}
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Saksham Home">
            <span className={styles.logoBadge}>SK</span>
            <span className={styles.brandText}>SAKSHAM</span>
          </Link>

          <div className={styles.kioskTag} aria-label={`Connected to ${DEFAULT_KIOSK_DEVICE_ID}`}>
            <span className={styles.kioskDot} />
            <span>Kiosk: {DEFAULT_KIOSK_DEVICE_ID}</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main" className={styles.main}>
          {/* ================================================================
              STATE 1: WAITING STATE (Default)
              ================================================================ */}
          {uiState === "WAITING" && (
            <div className={styles.card} role="region" aria-labelledby="waiting-heading">
              {/* Concentric Pulsing Biometric Scanner Animation */}
              <div
                className={styles.scannerContainer}
                role="img"
                aria-label="Pulsing fingerprint scanner listening for thumb"
              >
                <div className={styles.pulseRing1} />
                <div className={styles.pulseRing2} />
                <div className={styles.pulseRing3} />
                <div className={styles.sensorPad}>
                  <div className={styles.scanline} />
                  {/* Fingerprint SVG Icon */}
                  <svg
                    width="56"
                    height="56"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                    <path d="M2 16h.01" />
                    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                    <path d="M17 7.5a6 6 0 0 0-7.85-2.2" />
                    <path d="M12 2a10 10 0 0 0-9.42 13.3" />
                  </svg>
                </div>
              </div>

              <div>
                <h1 id="waiting-heading" className={styles.heading}>
                  Place your thumb on the scanner
                </h1>
                <p className={styles.subtext}>
                  Waiting for the kiosk to read your fingerprint…
                </p>
              </div>

              <div className={styles.timerPill} aria-label={`Timeout in ${secondsRemaining} seconds`}>
                <span>Sensor timeout in {secondsRemaining}s</span>
              </div>

              {/* Always-visible manual fallback link */}
              <button
                type="button"
                className={styles.linkFallback}
                onClick={() => setUiState("MANUAL")}
              >
                <KeyboardIcon aria-hidden="true" />
                Use roll number instead
              </button>
            </div>
          )}

          {/* ================================================================
              STATE 2: SUCCESS STATE
              ================================================================ */}
          {uiState === "SUCCESS" && (
            <div className={styles.card} role="alert" aria-labelledby="success-heading">
              <div className={styles.successCircle}>
                <CheckIcon size={46} aria-hidden="true" />
              </div>

              <div>
                <h1 id="success-heading" className={styles.heading}>
                  Welcome,
                  <span className={styles.successCandidate}>{candidateName}</span>
                </h1>
                <p className={styles.subtext} style={{ marginTop: "0.5rem" }}>
                  Starting your exam…
                </p>
              </div>

              <div className={styles.timerPill} style={{ color: "#4fd1a5" }}>
                <span>✓ Biometric matched on {DEFAULT_KIOSK_DEVICE_ID}</span>
              </div>
            </div>
          )}

          {/* ================================================================
              STATE 3: FAIL / TIMEOUT STATE
              ================================================================ */}
          {uiState === "FAIL" && (
            <div className={styles.card} role="alert" aria-labelledby="fail-heading">
              <div className={styles.failCircle}>
                <AlertTriangleIcon size={42} aria-hidden="true" />
              </div>

              <div>
                <h1 id="fail-heading" className={styles.heading}>
                  No scan detected
                </h1>
                <p className={styles.failTitleHinglish}>
                  Thumb match nahi hua
                </p>
                <p className={styles.subtext} style={{ marginTop: "0.5rem" }}>
                  The kiosk couldn&apos;t detect your thumb print. Ensure your finger is centered on the optical prism.
                </p>
              </div>

              <div className={styles.actionButtonGroup}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setUiState("WAITING")}
                >
                  <ReplayIcon aria-hidden="true" /> Try again
                </button>

                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setUiState("MANUAL")}
                >
                  <KeyboardIcon aria-hidden="true" /> Use roll number instead
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              MANUAL LOGIN FALLBACK (ROLL NUMBER + OTP)
              ================================================================ */}
          {uiState === "MANUAL" && (
            <div className={styles.card} role="region" aria-labelledby="manual-heading">
              <div style={{ textAlign: "center" }}>
                <h1 id="manual-heading" className={styles.heading}>
                  Manual Roll Number Login
                </h1>
                <p className={styles.subtext} style={{ marginTop: "0.25rem" }}>
                  Reliable alternative when biometric kiosk is unavailable.
                </p>
              </div>

              {manualError && (
                <div className={styles.formError} role="alert">
                  {manualError}
                </div>
              )}

              {!otpSent ? (
                <form className={styles.manualForm} onSubmit={handleSendOtp}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="rollNumberInput" className={styles.fieldLabel}>
                      Candidate Roll Number
                    </label>
                    <input
                      id="rollNumberInput"
                      type="text"
                      className={styles.input}
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. SAK-2026-001"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={manualLoading}
                  >
                    {manualLoading ? "Sending OTP…" : "Send OTP"}
                    <ArrowRightIcon aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <form className={styles.manualForm} onSubmit={handleVerifyOtp}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="otpInput" className={styles.fieldLabel}>
                      Enter 6-Digit OTP
                    </label>
                    <input
                      id="otpInput"
                      type="text"
                      className={styles.input}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      required
                      autoFocus
                    />
                    {demoOtpHint && (
                      <p className={styles.infoBox}>
                        Demo Test OTP: <strong>{demoOtpHint}</strong>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={manualLoading}
                  >
                    {manualLoading ? "Verifying…" : "Verify OTP & Start Exam"}
                    <ShieldIcon aria-hidden="true" />
                  </button>
                </form>
              )}

              {/* Link back to Thumb Scan */}
              <button
                type="button"
                className={styles.linkFallback}
                onClick={() => {
                  setUiState("WAITING")
                  setOtpSent(false)
                  setManualError(null)
                }}
              >
                ← Back to thumb scanner
              </button>
            </div>
          )}
        </main>

        {/* ==================================================================
            DEV / EVALUATION KIOSK SIMULATOR (NON-INTRUSIVE TEST HELPER)
            ================================================================== */}
        <footer className={styles.simulatorBar} aria-label="Kiosk simulation controls">
          <span>ESP32 Hardware Simulator:</span>
          <button
            type="button"
            className={styles.simBtn}
            onClick={() => simulateKioskScan(1)}
            title="Simulate fingerprint ID 1 (Aarav Sharma)"
          >
            Simulate ID #1 (Aarav)
          </button>
          <button
            type="button"
            className={styles.simBtn}
            onClick={() => simulateKioskScan(2)}
            title="Simulate fingerprint ID 2 (Priya Patel)"
          >
            Simulate ID #2 (Priya)
          </button>
          <button
            type="button"
            className={styles.simBtnSecondary}
            onClick={() => setUiState("FAIL")}
            title="Force timeout fail state"
          >
            Force Timeout
          </button>
        </footer>
      </div>
    </>
  )
}
