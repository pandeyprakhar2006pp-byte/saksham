"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { classifyHandLandmarks } from "@/lib/gesture/gestureClassifier"
import { CameraIcon, CheckIcon, KeyboardIcon, MicIcon, SignLanguageIcon } from "@/components/ui/icons"
import type { AnswerSubmissionResponse, GestureClassificationResult, LandmarkPoint } from "@/types"
import styles from "./ISLGestureRecognizer.module.css"

/**
 * ============================================================================
 * ISLGestureRecognizer Client Component
 * ============================================================================
 *
 * Runs MediaPipe Hands directly on-device in the candidate's browser via webcam.
 * No video frames or biometric data leave the browser.
 *
 * NOTE ON CLASSIFIER IMPLEMENTATION:
 * The current classifier uses a geometric finger-extension heuristic from the
 * 21 MediaPipe landmarks (1 finger = A, 2 fingers = B, 3 fingers = C, 4 fingers = D,
 * Open Palm = Confirm) as an architectural placeholder for full Indian Sign
 * Language (ISL) fingerspelling. This component interfaces cleanly with
 * `classifyHandLandmarks`, enabling zero-refactor replacement with a trained
 * ISL neural network (e.g. TensorFlow.js / TFLite) in the future.
 *
 * TWO-STEP ANTI-ACCIDENTAL SUBMISSION MECHANISM:
 * 1. Selection: Candidate holds hand shape (A, B, C, or D) for ~1.0s (1000ms).
 * 2. Confirmation: Candidate holds Open Palm (✋) for ~0.8s (800ms) to submit.
 * ============================================================================
 */

export interface ISLGestureRecognizerProps {
  sessionId: string
  questionId: string | number
  onOptionSelected?: (optionIndex: number, optionLetter: string) => void
  onSubmitted?: (result: AnswerSubmissionResponse) => void
  submitEndpoint?: string
  onFallbackToKeyboard?: () => void
  onFallbackToVoice?: () => void
}

const SELECT_HOLD_MS = 1000 // ~1.0s to select an option
const CONFIRM_HOLD_MS = 800 // ~0.8s open-palm hold to confirm/submit

// MediaPipe connections for hand skeleton visualization
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17],                              // Palm base
]

export function ISLGestureRecognizer({
  sessionId,
  questionId,
  onOptionSelected,
  onSubmitted,
  submitEndpoint = "/api/exam/answer",
  onFallbackToKeyboard,
  onFallbackToVoice,
}: ISLGestureRecognizerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Status & Camera state
  const [cameraState, setCameraState] = useState<"loading" | "active" | "denied" | "unsupported">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Gesture detection state
  const [detectedShape, setDetectedShape] = useState<string>("Waiting for hand...")
  const [currentOption, setCurrentOption] = useState<number | null>(null)
  const [currentLetter, setCurrentLetter] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [isLowConfidence, setIsLowConfidence] = useState<boolean>(false)

  // Two-step hold state machine
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [holdProgress, setHoldProgress] = useState<number>(0)
  const [confirmProgress, setConfirmProgress] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false)

  // Timing refs for hold detection
  const holdCandidateRef = useRef<{ option: number; letter: string; startTime: number } | null>(null)
  const confirmCandidateRef = useRef<{ startTime: number } | null>(null)
  const selectedOptionRef = useRef<number | null>(null)
  selectedOptionRef.current = selectedOption

  // Reset states when question changes
  useEffect(() => {
    setSelectedOption(null)
    setSelectedLetter(null)
    setHoldProgress(0)
    setConfirmProgress(0)
    setSubmittedSuccess(false)
    holdCandidateRef.current = null
    confirmCandidateRef.current = null
  }, [questionId])

  // Submits the confirmed answer to the backend API route
  const submitAnswer = useCallback(
    async (optionIndex: number, optionLetterStr: string, gestureConf: number) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        const payload = {
          sessionId,
          questionId,
          selectedOption: optionIndex,
          mode: "sign" as const,
          confidence: gestureConf || 0.95,
          metadata: {
            method: "ISL_GESTURE_TWO_STEP",
            selectedLetter: optionLetterStr,
            twoStepHoldConfirmed: true,
          },
        }

        const res = await fetch(submitEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const data: AnswerSubmissionResponse = await res.json()
        setSubmittedSuccess(true)

        if (onSubmitted) {
          onSubmitted(data)
        }
      } catch (err) {
        console.error("Failed to submit gesture answer:", err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [sessionId, questionId, submitEndpoint, onSubmitted, isSubmitting],
  )

  // Handles frame classification results
  const handleLandmarksDetected = useCallback(
    (landmarks: LandmarkPoint[] | null) => {
      const result: GestureClassificationResult = classifyHandLandmarks(landmarks)
      const now = performance.now()

      setConfidence(result.confidence)
      setIsLowConfidence(result.confidence < 0.5 && result.shape !== "UNKNOWN")

      // Update detected shape badge
      switch (result.shape) {
        case "ONE_FINGER":
          setDetectedShape('1 Finger Extended -> Option "A"')
          break
        case "TWO_FINGERS":
          setDetectedShape('2 Fingers Extended (V) -> Option "B"')
          break
        case "THREE_FINGERS":
          setDetectedShape('3 Fingers Extended -> Option "C"')
          break
        case "FOUR_FINGERS":
          setDetectedShape('4 Fingers Extended -> Option "D"')
          break
        case "OPEN_PALM":
          setDetectedShape("Open Palm ✋ (Confirm & Submit)")
          break
        case "FIST":
          setDetectedShape("Fist / Neutral")
          break
        default:
          setDetectedShape("Detecting hand gesture...")
          break
      }

      setCurrentOption(result.mappedOption)
      setCurrentLetter(result.mappedLetter)

      // ── Step 1: Hold to Select Option (A, B, C, D) ───────────────
      if (result.mappedOption !== null && result.mappedLetter !== null) {
        const opt = result.mappedOption
        const letStr = result.mappedLetter

        if (
          holdCandidateRef.current &&
          holdCandidateRef.current.option === opt
        ) {
          const elapsed = now - holdCandidateRef.current.startTime
          const pct = Math.min(100, (elapsed / SELECT_HOLD_MS) * 100)
          setHoldProgress(pct)

          if (elapsed >= SELECT_HOLD_MS) {
            // Option selection threshold reached!
            setSelectedOption(opt)
            setSelectedLetter(letStr)
            setHoldProgress(100)
            holdCandidateRef.current = null

            if (onOptionSelected) {
              onOptionSelected(opt, letStr)
            }
          }
        } else {
          holdCandidateRef.current = { option: opt, letter: letStr, startTime: now }
          setHoldProgress(0)
        }
      } else {
        holdCandidateRef.current = null
        setHoldProgress(0)
      }

      // ── Step 2: Open Palm Hold to Confirm / Submit ───────────────
      if (selectedOptionRef.current !== null && result.isOpenPalm && !submittedSuccess) {
        if (confirmCandidateRef.current) {
          const elapsed = now - confirmCandidateRef.current.startTime
          const pct = Math.min(100, (elapsed / CONFIRM_HOLD_MS) * 100)
          setConfirmProgress(pct)

          if (elapsed >= CONFIRM_HOLD_MS) {
            // Open-palm confirmation threshold reached!
            setConfirmProgress(100)
            confirmCandidateRef.current = null
            const optionToSubmit = selectedOptionRef.current
            const letterToSubmit = String.fromCharCode(65 + optionToSubmit)
            submitAnswer(optionToSubmit, letterToSubmit, result.confidence)
          }
        } else {
          confirmCandidateRef.current = { startTime: now }
          setConfirmProgress(0)
        }
      } else {
        confirmCandidateRef.current = null
        setConfirmProgress(0)
      }
    },
    [onOptionSelected, submitAnswer, submittedSuccess],
  )

  // Draw hand skeleton on canvas
  const drawLandmarks = useCallback((landmarks: LandmarkPoint[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw connection lines
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 3
    for (const [start, end] of HAND_CONNECTIONS) {
      const p1 = landmarks[start]
      const p2 = landmarks[end]
      if (p1 && p2) {
        ctx.beginPath()
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height)
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height)
        ctx.stroke()
      }
    }

    // Draw landmark joints
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i]
      ctx.beginPath()
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? 5 : 3, 0, 2 * Math.PI)
      ctx.fillStyle = i === 8 ? "#10b981" : i === 0 ? "#f59e0b" : "#ffffff"
      ctx.fill()
    }
  }, [])

  // Initialize webcam and MediaPipe Hands
  useEffect(() => {
    let isActive = true
    let animationFrameId: number
    let handsInstance: any = null

    async function setupCameraAndMediaPipe() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraState("unsupported")
        setErrorMsg("Camera access is not supported by your browser.")
        return
      }

      try {
        // Request webcam video
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        })

        if (!isActive) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }

        // Dynamically load MediaPipe Hands from CDN
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js")
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")

        if (!isActive) return

        const HandsClass = (window as any).Hands
        if (!HandsClass) {
          throw new Error("MediaPipe Hands library could not be initialized.")
        }

        handsInstance = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        })

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        })

        handsInstance.onResults((results: any) => {
          if (!isActive) return
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const rawLandmarks = results.multiHandLandmarks[0]
            drawLandmarks(rawLandmarks)
            handleLandmarksDetected(rawLandmarks)
          } else {
            // No hand detected in frame
            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext("2d")
              ctx?.clearRect(0, 0, canvas.width, canvas.height)
            }
            handleLandmarksDetected(null)
          }
        })

        // Frame loop feeding video to MediaPipe Hands on-device
        const processFrame = async () => {
          if (!isActive) return
          if (videoRef.current && videoRef.current.readyState >= 2 && handsInstance) {
            try {
              await handsInstance.send({ image: videoRef.current })
            } catch {
              // Ignore transient frame processing dropped frames
            }
          }
          animationFrameId = requestAnimationFrame(processFrame)
        }

        setCameraState("active")
        animationFrameId = requestAnimationFrame(processFrame)
      } catch (err: any) {
        console.error("Camera/MediaPipe setup error:", err)
        if (isActive) {
          if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
            setCameraState("denied")
            setErrorMsg("Camera permission was denied. Please allow camera access in browser settings.")
          } else {
            setCameraState("unsupported")
            setErrorMsg("Could not start on-device gesture recognition.")
          }
        }
      }
    }

    setupCameraAndMediaPipe()

    return () => {
      isActive = false
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (handsInstance) {
        try {
          handsInstance.close()
        } catch {}
      }
    }
  }, [drawLandmarks, handleLandmarksDetected])

  // Helper function to dynamically load required scripts
  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }
      const script = document.createElement("script")
      script.src = src
      script.crossOrigin = "anonymous"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  }

  // Simulation handlers for testing without a physical webcam
  const simulateShape = (optionIndex: number, letter: string) => {
    setSelectedOption(optionIndex)
    setSelectedLetter(letter)
    setHoldProgress(100)
    if (onOptionSelected) onOptionSelected(optionIndex, letter)
  }

  const simulateConfirm = () => {
    if (selectedOption !== null) {
      setConfirmProgress(100)
      submitAnswer(selectedOption, String.fromCharCode(65 + selectedOption), 0.98)
    }
  }

  return (
    <aside className={styles.wrap} aria-label="ISL Hand-Gesture Recognition">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <SignLanguageIcon size={20} aria-hidden="true" />
          <h2 className={styles.title}>ISL Gesture Mode</h2>
        </div>
        <span className={styles.badgeLive}>
          <span className={styles.pulseDot} /> On-Device
        </span>
      </div>

      {/* Video & Landmark Canvas Viewport */}
      <div className={styles.stage} role="region" aria-label="Webcam Gesture Input Feed">
        <video
          ref={videoRef}
          className={styles.videoFeed}
          playsInline
          muted
          width={640}
          height={480}
        />
        <canvas
          ref={canvasRef}
          className={styles.canvasOverlay}
          width={640}
          height={480}
        />

        {/* Loading overlay */}
        {cameraState === "loading" && (
          <div className={styles.stateOverlay}>
            <CameraIcon className={styles.stateIcon} size={32} />
            <p className={styles.stateTitle}>Initializing On-Device MediaPipe...</p>
            <p className={styles.stateDesc}>Requesting webcam. No video leaves your browser.</p>
          </div>
        )}

        {/* Permission Denied overlay */}
        {cameraState === "denied" && (
          <div className={styles.stateOverlay}>
            <CameraIcon className={styles.stateIcon} size={32} />
            <p className={styles.stateTitle}>Camera Access Blocked</p>
            <p className={styles.stateDesc}>{errorMsg}</p>
            {onFallbackToKeyboard && (
              <button type="button" className={styles.btnPrimary} onClick={onFallbackToKeyboard}>
                <KeyboardIcon /> Use Keyboard Instead
              </button>
            )}
          </div>
        )}

        {/* Unsupported / Error overlay */}
        {cameraState === "unsupported" && (
          <div className={styles.stateOverlay}>
            <CameraIcon className={styles.stateIcon} size={32} />
            <p className={styles.stateTitle}>Camera Unavailable</p>
            <p className={styles.stateDesc}>{errorMsg || "Unable to start webcam recognition."}</p>
            {onFallbackToKeyboard && (
              <button type="button" className={styles.btnPrimary} onClick={onFallbackToKeyboard}>
                <KeyboardIcon /> Use Keyboard Instead
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Card: Step 1 (Select) & Step 2 (Confirm) */}
      <div className={styles.feedbackCard}>
        <div className={styles.feedbackTop}>
          <span
            className={`${styles.stepPill} ${
              selectedOption !== null ? styles.stepPillConfirm : ""
            }`}
          >
            {selectedOption === null ? "Step 1: Select" : "Step 2: Confirm"}
          </span>
          <span className={styles.detectedStatus}>
            {detectedShape}
          </span>
        </div>

        {/* Hold Progress Bar */}
        <div
          className={styles.holdBarContainer}
          role="progressbar"
          aria-valuenow={selectedOption === null ? Math.round(holdProgress) : Math.round(confirmProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`${styles.holdBarFill} ${
              selectedOption !== null ? styles.holdBarFillConfirm : ""
            }`}
            style={{
              width: `${selectedOption === null ? holdProgress : confirmProgress}%`,
            }}
          />
        </div>

        {/* Dynamic Instructional Prompt */}
        <p className={styles.promptText}>
          {selectedOption === null ? (
            <>
              <span>Hold sign for <strong>1.0s</strong> to select:</span>
              <span className={styles.highlightKey}>
                {currentLetter ? `Option ${currentLetter} (${Math.round(holdProgress)}%)` : "Waiting for sign..."}
              </span>
            </>
          ) : submittedSuccess ? (
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              ✓ Answer saved &amp; flagged for invigilator review
            </span>
          ) : (
            <>
              <span>Selected Option <strong>{selectedLetter}</strong>.</span>
              <span style={{ color: "#059669", fontWeight: 700 }}>
                Hold Open Palm ✋ for 0.8s to submit ({Math.round(confirmProgress)}%)
              </span>
            </>
          )}
        </p>
      </div>

      {/* Visual Guide to Shapes */}
      <div className={styles.guideGrid}>
        <div
          className={`${styles.guideItem} ${
            (currentOption === 0 || selectedOption === 0) ? styles.guideActive : ""
          }`}
        >
          <span className={styles.guideLetter}>A</span>
          <span className={styles.guideFingers}>1 finger</span>
        </div>
        <div
          className={`${styles.guideItem} ${
            (currentOption === 1 || selectedOption === 1) ? styles.guideActive : ""
          }`}
        >
          <span className={styles.guideLetter}>B</span>
          <span className={styles.guideFingers}>2 fingers (V)</span>
        </div>
        <div
          className={`${styles.guideItem} ${
            (currentOption === 2 || selectedOption === 2) ? styles.guideActive : ""
          }`}
        >
          <span className={styles.guideLetter}>C</span>
          <span className={styles.guideFingers}>3 fingers</span>
        </div>
        <div
          className={`${styles.guideItem} ${
            (currentOption === 3 || selectedOption === 3) ? styles.guideActive : ""
          }`}
        >
          <span className={styles.guideLetter}>D</span>
          <span className={styles.guideFingers}>4 fingers</span>
        </div>
      </div>

      {/* Fallback & Low Confidence Warning */}
      <div className={styles.fallbackSection}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className={styles.fallbackLabel}>Need to switch modes?</p>
          {/* Quick manual simulation buttons for testing environments without webcams */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              type="button"
              className={styles.simBtn}
              onClick={() => simulateShape(0, "A")}
              title="Test select option A"
            >
              Test A
            </button>
            <button
              type="button"
              className={styles.simBtn}
              onClick={() => simulateShape(1, "B")}
              title="Test select option B"
            >
              Test B
            </button>
            <button
              type="button"
              className={styles.simBtn}
              onClick={simulateConfirm}
              title="Test confirm & submit"
            >
              Confirm ✋
            </button>
          </div>
        </div>

        <div className={styles.fallbackRow}>
          {onFallbackToKeyboard && (
            <button
              type="button"
              className={styles.fallbackBtn}
              onClick={onFallbackToKeyboard}
            >
              <KeyboardIcon aria-hidden="true" /> Keyboard mode
            </button>
          )}
          {onFallbackToVoice && (
            <button
              type="button"
              className={styles.fallbackBtn}
              onClick={onFallbackToVoice}
            >
              <MicIcon aria-hidden="true" /> Voice mode
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
