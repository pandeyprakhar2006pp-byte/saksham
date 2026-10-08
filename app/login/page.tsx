"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AccessibilityBar } from "@/components/AccessibilityBar"
import { OperatorDeviceControl } from "@/components/OperatorDeviceControl"
import { arduinoDeviceManager } from "@/lib/hardware/deviceManager"
import type { CandidateAdmissionState, DeviceStatusInfo } from "@/lib/hardware/types"
import {
  CheckIcon,
  AlertTriangleIcon,
  ReplayIcon,
  ShieldIcon,
  ArrowRightIcon,
} from "@/components/ui/icons"
import styles from "./login.module.css"

export default function LoginPage() {
  const router = useRouter()

  // Hardware Connection & Admission State
  const [deviceInfo, setDeviceInfo] = useState<DeviceStatusInfo>(() =>
    arduinoDeviceManager.getStatus(),
  )
  const [admissionState, setAdmissionState] = useState<CandidateAdmissionState>(() => {
    const s = arduinoDeviceManager.getStatus().status
    if (s === "ready") return "ready"
    if (s === "connecting") return "connecting"
    return "disconnected"
  })

  // Candidate Admission Details
  const [candidateData, setCandidateData] = useState<{
    candidateId: string
    rollNumber: string
    name: string
    category: string
    examCode: string
  } | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [eligibilityStatus, setEligibilityStatus] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string>(
    "Arduino fingerprint reader login page. Connect device to begin.",
  )

  // Administrator Override Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false)
  const [adminRollNumber, setAdminRollNumber] = useState<string>("SAK-2026-001")
  const [adminPin, setAdminPin] = useState<string>("")
  const [adminReason, setAdminReason] = useState<string>(
    "Optical fingerprint sensor hardware failure; hall ticket and government ID verified manually by invigilator.",
  )
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSubmitting, setAdminSubmitting] = useState<boolean>(false)

  // Operator panel toggle
  const [showOperatorPanel, setShowOperatorPanel] = useState<boolean>(true)

  // Sync with Arduino Device Manager
  useEffect(() => {
    const unsubscribe = arduinoDeviceManager.subscribe(() => {
      const updated = arduinoDeviceManager.getStatus()
      setDeviceInfo(updated)

      if (updated.status === "disconnected") {
        setAdmissionState("disconnected")
        setAnnouncement("Arduino fingerprint scanner is disconnected.")
      } else if (updated.status === "connecting") {
        setAdmissionState("connecting")
        setAnnouncement("Connecting to Arduino fingerprint reader…")
      } else if (updated.status === "ready" && (admissionState === "disconnected" || admissionState === "connecting")) {
        setAdmissionState("ready")
        setAnnouncement("Arduino reader is ready. Place finger on optical prism.")
      }
    })
    return () => unsubscribe()
  }, [admissionState])

  // Trigger Biometric Scan & Two-Tier Admission Verification
  const handleTriggerScan = useCallback(async () => {
    if (deviceInfo.status !== "ready") return

    setAdmissionState("verifying")
    setErrorMessage(null)
    setEligibilityStatus(null)
    setAnnouncement("Finger detected. Reading biometric template and verifying exam eligibility…")

    const result = await arduinoDeviceManager.verifyAndAdmitCandidate()

    if (result.admitted && result.candidate && result.sessionId) {
      // Both Tier 1 (Fingerprint) and Tier 2 (Eligibility) passed!
      setCandidateData(result.candidate)
      setAdmissionState("verified")
      setAnnouncement(
        `Welcome, ${result.candidate.name}. Biometric verified and exam eligibility confirmed. Starting exam.`,
      )

      // Auto-redirect to /exam after 1.5 seconds
      setTimeout(() => {
        router.push(`/exam?sessionId=${encodeURIComponent(result.sessionId!)}`)
      }, 1500)
    } else {
      // Verification Failed (Biometric Mismatch OR Eligibility Rejection)
      setAdmissionState("verification_failed")
      setErrorMessage(result.error || "Authentication failed. Could not admit candidate.")
      setEligibilityStatus(result.eligibilityStatus || null)
      setAnnouncement(result.error || "Authentication failed.")
    }
  }, [deviceInfo.status, router])

  // Administrator Override Submission
  async function handleAdminOverride(e: React.FormEvent) {
    e.preventDefault()
    if (!adminRollNumber.trim() || !adminPin.trim() || !adminReason.trim()) {
      setAdminError("Please fill out all required fields.")
      return
    }

    setAdminSubmitting(true)
    setAdminError(null)

    try {
      const res = await fetch("/api/hardware/admin-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollNumber: adminRollNumber.trim(),
          adminPin: adminPin.trim(),
          overrideReason: adminReason.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.admitted) {
        setAdminError(data.message || "Administrator override was rejected.")
      } else {
        setIsAdminModalOpen(false)
        setCandidateData(data.candidate)
        setAdmissionState("verified")
        setAnnouncement(
          `Administrator override authorized for ${data.candidate.name}. Starting examination.`,
        )

        setTimeout(() => {
          router.push(`/exam?sessionId=${encodeURIComponent(data.sessionId)}`)
        }, 1500)
      }
    } catch {
      setAdminError("Network communication error during administrator override.")
    } finally {
      setAdminSubmitting(false)
    }
  }

  return (
    <>
      <AccessibilityBar />

      <div className={styles.page}>
        <div className={styles.bgGlow} aria-hidden="true" />

        {/* Screen Reader Live Region */}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* Top Header */}
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Saksham Home">
            <span className={styles.logoBadge}>SK</span>
            <span className={styles.brandText}>SAKSHAM</span>
          </Link>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              className={styles.simBtnSecondary}
              onClick={() => setShowOperatorPanel((prev) => !prev)}
              aria-expanded={showOperatorPanel}
            >
              {showOperatorPanel ? "Hide Operator Panel" : "Show Operator Panel"}
            </button>

            <button
              type="button"
              className={styles.simBtn}
              onClick={() => setIsAdminModalOpen(true)}
            >
              <ShieldIcon aria-hidden="true" /> Admin Override
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main" className={styles.main}>
          <div style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Operator Hardware-Device Connection Interface */}
            {showOperatorPanel && <OperatorDeviceControl />}

            {/* ============================================================
                STATE 1: DISCONNECTED STATE
                ============================================================ */}
            {admissionState === "disconnected" && (
              <div className={styles.card} role="region" aria-labelledby="disconnected-heading">
                <div className={styles.disconnectedCircle}>
                  <AlertTriangleIcon size={38} aria-hidden="true" />
                </div>

                <div>
                  <h1 id="disconnected-heading" className={styles.heading}>
                    Fingerprint Reader Disconnected
                  </h1>
                  <p className={styles.subtext} style={{ marginTop: "0.5rem" }}>
                    The Arduino optical fingerprint device is not connected to this station. The exam operator must connect the device, or an authorized invigilator can perform an override.
                  </p>
                </div>

                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => arduinoDeviceManager.connect({ baudRate: 57600 })}
                  >
                    Connect Arduino Scanner
                  </button>

                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsAdminModalOpen(true)}
                  >
                    <ShieldIcon aria-hidden="true" /> Administrator Fallback Override
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE 2: CONNECTING STATE
                ============================================================ */}
            {admissionState === "connecting" && (
              <div className={styles.card} role="region" aria-labelledby="connecting-heading">
                <div className={styles.verifyingCircle}>
                  <ReplayIcon size={36} aria-hidden="true" style={{ animation: "spin 2s linear infinite" }} />
                </div>

                <div>
                  <h1 id="connecting-heading" className={styles.heading}>
                    Connecting to Arduino Reader
                  </h1>
                  <p className={styles.subtext} style={{ marginTop: "0.5rem" }}>
                    Handshaking with Arduino optical prism via {deviceInfo.baudRate} baud serial interface…
                  </p>
                </div>

                <div className={styles.timerPill}>
                  <span>Initializing R307/AS608 optical sensor…</span>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE 3: READY STATE (Waiting for Candidate Finger)
                ============================================================ */}
            {admissionState === "ready" && (
              <div className={styles.card} role="region" aria-labelledby="ready-heading">
                {/* Visible Concentric Wave Pulsing Scanner */}
                <div
                  className={styles.scannerContainer}
                  role="img"
                  aria-label="Pulsing optical scanner actively listening for fingerprint"
                >
                  <div className={styles.pulseRing1} />
                  <div className={styles.pulseRing2} />
                  <div className={styles.pulseRing3} />
                  <div className={styles.sensorPad}>
                    <div className={styles.scanline} />
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
                  <h1 id="ready-heading" className={styles.heading}>
                    Place your thumb on the scanner
                  </h1>
                  <p className={styles.subtext}>
                    Optical prism active. Candidate will be admitted after biometric match and exam eligibility confirmation.
                  </p>
                </div>

                {/* Explicit indicator of Real vs Simulated Mode */}
                {deviceInfo.isSimulated ? (
                  <div className={styles.infoBox} style={{ color: "#fcd34d", borderColor: "rgba(245, 158, 11, 0.3)" }}>
                    <strong>Simulated Demo Mode:</strong> Optical reader is emulated. Real biometric verification requires a physical Arduino.
                  </div>
                ) : (
                  <div className={styles.timerPill} style={{ color: "#4fd1a5" }}>
                    <span>✓ Physical Arduino Optical Reader Online ({deviceInfo.portName})</span>
                  </div>
                )}

                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleTriggerScan}
                  >
                    Scan Fingerprint &amp; Verify Eligibility
                    <ArrowRightIcon aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className={styles.linkFallback}
                    onClick={() => setIsAdminModalOpen(true)}
                  >
                    <ShieldIcon aria-hidden="true" />
                    Authorized invigilator override
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE 4: VERIFYING STATE
                ============================================================ */}
            {admissionState === "verifying" && (
              <div className={styles.card} role="region" aria-labelledby="verifying-heading">
                <div className={styles.verifyingCircle}>
                  <div className={styles.pulseDot} style={{ width: "24px", height: "24px", background: "#60a5fa" }} />
                </div>

                <div>
                  <h1 id="verifying-heading" className={styles.heading}>
                    Verifying Candidate Admission…
                  </h1>
                  <p className={styles.subtext} style={{ marginTop: "0.5rem" }}>
                    1. Analyzing fingerprint minutiae on optical sensor…<br />
                    2. Verifying candidate enrollment &amp; exam eligibility…
                  </p>
                </div>

                <div className={styles.timerPill}>
                  <span>Two-tier admission gate in progress</span>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE 5: VERIFICATION FAILED (Biometric or Eligibility Failure)
                ============================================================ */}
            {admissionState === "verification_failed" && (
              <div className={styles.card} role="alert" aria-labelledby="failed-heading">
                <div className={styles.failCircle}>
                  <AlertTriangleIcon size={40} aria-hidden="true" />
                </div>

                <div>
                  <h1 id="failed-heading" className={styles.heading}>
                    Admission Verification Failed
                  </h1>
                  {eligibilityStatus && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span className={`${styles.eligibilityTag} ${styles.eligibilityRejected}`}>
                        Eligibility Status: {eligibilityStatus.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className={styles.subtext} style={{ marginTop: "0.6rem" }}>
                    {errorMessage || "Biometric fingerprint could not be matched or exam eligibility was rejected."}
                  </p>
                </div>

                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => setAdmissionState("ready")}
                  >
                    <ReplayIcon aria-hidden="true" /> Try Again
                  </button>

                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsAdminModalOpen(true)}
                  >
                    <ShieldIcon aria-hidden="true" /> Use Administrator Override
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                STATE 6: VERIFIED STATE (Both Biometric & Eligibility Confirmed)
                ============================================================ */}
            {admissionState === "verified" && candidateData && (
              <div className={styles.card} role="alert" aria-labelledby="verified-heading">
                <div className={styles.successCircle}>
                  <CheckIcon size={46} aria-hidden="true" />
                </div>

                <div>
                  <h1 id="verified-heading" className={styles.heading}>
                    Welcome,
                    <span className={styles.successCandidate}>{candidateData.name}</span>
                  </h1>
                  <p className={styles.subtext} style={{ marginTop: "0.4rem" }}>
                    Fingerprint verified &amp; exam eligibility confirmed. Starting examination…
                  </p>
                </div>

                {/* Candidate Credential & Eligibility Card */}
                <div className={styles.candidateCard}>
                  <div className={styles.candidateRow}>
                    <span className={styles.candidateKey}>Roll Number:</span>
                    <span className={styles.candidateVal}>{candidateData.rollNumber}</span>
                  </div>
                  <div className={styles.candidateRow}>
                    <span className={styles.candidateKey}>Category:</span>
                    <span className={styles.candidateVal}>{candidateData.category}</span>
                  </div>
                  <div className={styles.candidateRow}>
                    <span className={styles.candidateKey}>Exam Code:</span>
                    <span className={styles.candidateVal}>{candidateData.examCode}</span>
                  </div>
                  <div className={styles.candidateRow}>
                    <span className={styles.candidateKey}>Eligibility:</span>
                    <span className={`${styles.eligibilityTag} ${styles.eligibilityEligible}`}>
                      ✓ ADMITTED &amp; CONFIRMED
                    </span>
                  </div>
                </div>

                <div className={styles.timerPill} style={{ color: "#4fd1a5" }}>
                  <span>✓ Authenticated via {deviceInfo.adapterName}</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ================================================================
            AUTHORIZED ADMINISTRATOR OVERRIDE MODAL
            ================================================================ */}
        {isAdminModalOpen && (
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
          >
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 id="admin-modal-title" className={styles.modalTitle}>
                  <ShieldIcon aria-hidden="true" /> Administrator Override
                </h2>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsAdminModalOpen(false)}
                  aria-label="Close override modal"
                >
                  ✕
                </button>
              </div>

              <p className={styles.subtext} style={{ textAlign: "left" }}>
                Authorized invigilator fallback for hardware device failures or candidate biometric read errors.
              </p>

              <div className={styles.auditDisclaimer}>
                <strong>Mandatory Audit Trail:</strong> Every administrator override is logged in the MongoDB database with timestamp, candidate roll number, and invigilator reason.
              </div>

              {adminError && (
                <div className={styles.formError} role="alert">
                  {adminError}
                </div>
              )}

              <form className={styles.manualForm} onSubmit={handleAdminOverride}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="adminRollInput" className={styles.fieldLabel}>
                    Candidate Roll Number:
                  </label>
                  <input
                    id="adminRollInput"
                    type="text"
                    className={styles.input}
                    value={adminRollNumber}
                    onChange={(e) => setAdminRollNumber(e.target.value)}
                    placeholder="e.g. SAK-2026-001"
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="adminPinInput" className={styles.fieldLabel}>
                    Administrator Authorization PIN:
                  </label>
                  <input
                    id="adminPinInput"
                    type="password"
                    className={styles.input}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Enter Admin Authorization PIN"
                    required
                  />
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    Demo Authorization PIN: <code>SAKSHAM-ADMIN-2026</code> or <code>admin123</code>
                  </span>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="adminReasonInput" className={styles.fieldLabel}>
                    Invigilator Justification / Reason:
                  </label>
                  <textarea
                    id="adminReasonInput"
                    className={styles.input}
                    rows={2}
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsAdminModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? "Authorizing…" : "Authorize & Admit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
