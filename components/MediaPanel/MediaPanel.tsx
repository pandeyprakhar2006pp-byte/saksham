"use client"

import { useCallback, useState } from "react"
import {
  VideoIcon,
  CameraIcon,
  SignLanguageIcon,
  PlayIcon,
  ReplayIcon,
  ClosedCaptionIcon,
  MicIcon,
  KeyboardIcon,
} from "@/components/ui/icons"
import { useGestureDemo } from "@/hooks/useGestureDemo"
import { useTextToSpeech } from "@/hooks/useTextToSpeech"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { ISLGestureRecognizer } from "@/components/ISLGestureRecognizer"
import type { ExamMode, MediaTab, Question } from "@/types"
import styles from "./MediaPanel.module.css"

interface MediaPanelProps {
  mode: ExamMode
  question: Question
  questionNumber?: number
  sessionId?: string
  islCaption: string
  onGestureConfirmed: () => void
  onSelectOption: (index: number) => void
  onClearAnswer: () => void
  onNext: () => void
  onPrev: () => void
  onMarkReview: () => void
  onReread: () => void
  onSpeakAnswer: () => void
  onModeChange?: (mode: ExamMode) => void
}

const TABS: { id: MediaTab; label: string; Icon: typeof VideoIcon }[] = [
  { id: "cam", label: "Gesture Camera", Icon: CameraIcon },
  { id: "isl", label: "ISL Interpreter", Icon: VideoIcon },
]

const SPEEDS = [1, 1.25, 1.5, 0.75]

function optionLetter(index: number) {
  return String.fromCharCode(65 + index)
}

export function MediaPanel({
  mode,
  question,
  questionNumber = 1,
  sessionId = "session-saksham-2026",
  islCaption,
  onGestureConfirmed,
  onSelectOption,
  onClearAnswer,
  onNext,
  onPrev,
  onMarkReview,
  onReread,
  onSpeakAnswer,
  onModeChange,
}: MediaPanelProps) {
  if (mode === "sign") {
    return (
      <InterpreterPanel
        question={question}
        questionNumber={questionNumber}
        sessionId={sessionId}
        islCaption={islCaption}
        onGestureConfirmed={onGestureConfirmed}
        onSelectOption={onSelectOption}
        onModeChange={onModeChange}
      />
    )
  }

  if (mode === "key") {
    return <KeyboardPanel />
  }

  return (
    <VoicePanel
      question={question}
      onSelectOption={onSelectOption}
      onClearAnswer={onClearAnswer}
      onNext={onNext}
      onPrev={onPrev}
      onMarkReview={onMarkReview}
      onReread={onReread}
      onSpeakAnswer={onSpeakAnswer}
    />
  )
}

/* ===================== Sign gesture mode ===================== */

function InterpreterPanel({
  question,
  questionNumber,
  sessionId,
  islCaption,
  onGestureConfirmed,
  onSelectOption,
  onModeChange,
}: {
  question: Question
  questionNumber: number
  sessionId: string
  islCaption: string
  onGestureConfirmed: () => void
  onSelectOption: (index: number) => void
  onModeChange?: (mode: ExamMode) => void
}) {
  const [tab, setTab] = useState<MediaTab>("cam")
  const [captionsOn, setCaptionsOn] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(0)
  const tts = useTextToSpeech()

  function handlePlay() {
    tts.speak(question.q, { rate: SPEEDS[speedIndex] })
  }

  function handleReplay() {
    tts.speak(question.q, { rate: SPEEDS[speedIndex] })
  }

  function cycleSpeed() {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length)
  }

  return (
    <aside className={styles.wrap} aria-label="Interpreter and gesture panel">
      <div className={styles.tabs} role="tablist" aria-label="Media mode">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={isActive}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      {tab === "cam" ? (
        <ISLGestureRecognizer
          sessionId={sessionId}
          questionId={questionNumber}
          onOptionSelected={(index) => onSelectOption(index)}
          onSubmitted={() => onGestureConfirmed()}
          onFallbackToKeyboard={() => onModeChange?.("key")}
          onFallbackToVoice={() => onModeChange?.("voice")}
        />
      ) : (
        <div className={styles.panelBody} role="tabpanel">
          <div className={styles.islScreen}>
            <SignLanguageIcon size={52} aria-hidden="true" />
            {captionsOn && <p className={styles.signingCaption}>{islCaption}</p>}
          </div>

          <div className={styles.playbackRow}>
            <button type="button" className={styles.playBtn} onClick={handlePlay}>
              <PlayIcon aria-hidden="true" /> Play
            </button>
            <button type="button" className={styles.replayBtn} onClick={handleReplay}>
              <ReplayIcon aria-hidden="true" /> Replay
            </button>
            <button type="button" className={styles.speedBtn} onClick={cycleSpeed}>
              {SPEEDS[speedIndex]}x
            </button>
          </div>

          <button
            type="button"
            className={styles.ccBtn}
            aria-pressed={captionsOn}
            onClick={() => setCaptionsOn((v) => !v)}
          >
            <ClosedCaptionIcon aria-hidden="true" /> CC
          </button>
        </div>
      )}
    </aside>
  )
}

/* ===================== Voice mode ===================== */

interface VoicePanelProps {
  question: Question
  onSelectOption: (index: number) => void
  onClearAnswer: () => void
  onNext: () => void
  onPrev: () => void
  onMarkReview: () => void
  onReread: () => void
  onSpeakAnswer: () => void
}

function VoicePanel({
  question,
  onSelectOption,
  onClearAnswer,
  onNext,
  onPrev,
  onMarkReview,
  onReread,
  onSpeakAnswer,
}: VoicePanelProps) {
  const tts = useTextToSpeech()

  const handleCommand = useCallback((text: string) => {
    // ── Select option ──────────────────────────────────────────────────────
    // Matches: "option a", "select b", "choose c", "answer d", "option 1–4"
    const optionMatch = text.match(/(?:option|select|choose|answer|pick)\s+([a-d1-4])/)
    if (optionMatch) {
      const val = optionMatch[1]
      const index = val >= "1" && val <= "4"
        ? parseInt(val, 10) - 1
        : val.charCodeAt(0) - 97
      if (index >= 0 && index < question.opts.length) {
        onSelectOption(index)
      }
      return
    }

    // ── Navigation ─────────────────────────────────────────────────────────
    if (text.includes("next") || text.includes("save") || text.includes("submit")) {
      onNext()
      return
    }
    if (text.includes("previous") || text.includes("go back") || text.includes("prev") || text.includes("back")) {
      onPrev()
      return
    }

    // ── Answer management ──────────────────────────────────────────────────
    if (text.includes("clear") || text.includes("remove") || text.includes("deselect") || text.includes("unselect")) {
      onClearAnswer()
      return
    }
    if (text.includes("my answer") || text.includes("speak answer") || text.includes("what") || text.includes("verify")) {
      onSpeakAnswer()
      return
    }

    // ── Question reading ───────────────────────────────────────────────────
    if (text.includes("reread") || text.includes("re-read") || text.includes("read again") || text.includes("read question") || text.includes("repeat")) {
      onReread()
      return
    }

    // ── Mark for review ────────────────────────────────────────────────────
    if (text.includes("mark") || text.includes("review") || text.includes("flag")) {
      onMarkReview()
      return
    }

    // ── Help: read all commands aloud ──────────────────────────────────────
    if (text.includes("help") || text.includes("commands") || text.includes("what can")) {
      tts.speak(
        "Available commands: " +
        "Say Option A, B, C, or D to select an answer. " +
        "Say Next question to move forward. " +
        "Say Previous to go back. " +
        "Say Clear answer to deselect. " +
        "Say Speak my answer to confirm your selection. " +
        "Say Reread question to hear the question again. " +
        "Say Mark for review to flag this question."
      )
      return
    }
  }, [question.opts.length, onSelectOption, onNext, onPrev, onClearAnswer, onSpeakAnswer, onReread, onMarkReview, tts])

  const {
    transcript,
    listening,
    supported,
    error,
    micPermission,
    requestMicPermission,
    toggleListening,
  } = useSpeechRecognition({ enabled: true, onCommand: handleCommand })

  const commands = [
    {
      phrase: '"Option A / B / C / D"',
      desc: "Select that option as your answer",
      run: () => onSelectOption(0),
    },
    {
      phrase: '"Next question"',
      desc: "Save answer & move forward",
      run: onNext,
    },
    {
      phrase: '"Previous"',
      desc: "Go to the previous question",
      run: onPrev,
    },
    {
      phrase: '"Clear answer"',
      desc: "Remove your current selection",
      run: onClearAnswer,
    },
    {
      phrase: '"Reread question"',
      desc: "Read the question aloud again",
      run: onReread,
    },
    {
      phrase: '"Speak my answer"',
      desc: "Confirm which option you picked",
      run: onSpeakAnswer,
    },
    {
      phrase: '"Mark for review"',
      desc: "Flag this question to revisit later",
      run: onMarkReview,
    },
    {
      phrase: '"Help"',
      desc: "Read all available commands aloud",
      run: () => handleCommand("help"),
    },
  ]

  // ── Screen 1: Browser doesn't support the required APIs ─────────────────
  if (!supported) {
    return (
      <aside className={styles.wrap} aria-label="Voice input panel">
        <h2 className={styles.panelHeading}>Voice input</h2>
        <div className={styles.permissionScreen}>
          <MicIcon size={36} aria-hidden="true" className={styles.permIconUnavailable} />
          <p className={styles.permTitle}>Not supported</p>
          <p className={styles.permDesc}>
            Your browser does not support microphone access. Try Chrome or Edge.
          </p>
        </div>
      </aside>
    )
  }

  // ── Screen 2: Permission denied — user must unblock in browser settings ──
  if (micPermission === "denied") {
    return (
      <aside className={styles.wrap} aria-label="Voice input panel">
        <h2 className={styles.panelHeading}>Voice input</h2>
        <div className={styles.permissionScreen}>
          <MicIcon size={36} aria-hidden="true" className={styles.permIconDenied} />
          <p className={styles.permTitle}>Microphone blocked</p>
          <p className={styles.permDesc}>
            If you&apos;ve already enabled the microphone in the address bar, click below. Otherwise:
          </p>
          <button
            type="button"
            className={styles.permAllowBtn}
            onClick={requestMicPermission}
          >
            <MicIcon aria-hidden="true" /> Check again
          </button>
          <ol className={styles.permSteps}>
            <li>Click the <strong>🔒 lock icon</strong> in your browser&apos;s address bar</li>
            <li>Set <strong>Microphone</strong> to <strong>Allow</strong></li>
            <li>Click <strong>Check again</strong> above</li>
          </ol>
        </div>
        <hr className={styles.permDivider} />
        <p className={styles.commandLabel}>Use shortcuts instead</p>
        <div className={styles.commandList}>
          {commands.map((cmd) => (
            <button key={cmd.phrase} type="button" className={styles.commandCard} onClick={cmd.run}>
              <span className={styles.commandPhrase}>{cmd.phrase}</span>
              <span className={styles.commandDesc}>{cmd.desc}</span>
            </button>
          ))}
        </div>
      </aside>
    )
  }

  // ── Screen 3: Permission not yet asked ("prompt") — show Allow button ────
  if (micPermission === "prompt" || micPermission === "unknown") {
    return (
      <aside className={styles.wrap} aria-label="Voice input panel">
        <h2 className={styles.panelHeading}>Voice input</h2>
        <div className={styles.permissionScreen}>
          <MicIcon size={36} aria-hidden="true" className={styles.permIconIdle} />
          <p className={styles.permTitle}>Allow microphone</p>
          <p className={styles.permDesc}>
            SAKSHAM needs microphone access to listen to your voice commands. Your audio
            is only used to transcribe answers — it is never stored.
          </p>
          <button
            type="button"
            className={styles.permAllowBtn}
            onClick={requestMicPermission}
          >
            <MicIcon aria-hidden="true" /> Allow Microphone
          </button>
        </div>
        <hr className={styles.permDivider} />
        <p className={styles.commandLabel}>Or use shortcuts instead</p>
        <div className={styles.commandList}>
          {commands.map((cmd) => (
            <button key={cmd.phrase} type="button" className={styles.commandCard} onClick={cmd.run}>
              <span className={styles.commandPhrase}>{cmd.phrase}</span>
              <span className={styles.commandDesc}>{cmd.desc}</span>
            </button>
          ))}
        </div>
      </aside>
    )
  }

  // ── Screen 4: Permission granted — normal listening UI ───────────────────
  return (
    <aside className={styles.wrap} aria-label="Voice input panel">
      <h2 className={styles.panelHeading}>Voice input</h2>

      <button
        type="button"
        className={`${styles.listeningRow} ${listening ? styles.listeningRowActive : ""}`}
        onClick={toggleListening}
        aria-label={listening ? "Microphone active. Click to pause." : "Microphone ready. Click to start listening."}
      >
        <MicIcon aria-hidden="true" className={listening ? styles.listeningIcon : styles.idleIcon} />
        <span className={listening ? styles.listeningText : styles.idleText}>
          {listening ? "Listening... (Click to pause)" : "Click to start listening"}
        </span>
      </button>

      {error && (
        <div className={styles.voiceError} role="alert">
          {error === "no-key"
            ? "Deepgram API key not set. Add NEXT_PUBLIC_DEEPGRAM_API_KEY to .env.local and restart the server."
            : error === "network"
            ? "Could not connect to Deepgram. Check your internet connection and API key."
            : `Voice error: ${error}`}
        </div>
      )}

      <p className={styles.inputBox}>{transcript || "Say a command below, or speak naturally."}</p>

      <p className={styles.commandLabel}>Try a command</p>
      <div className={styles.commandList}>
        {commands.map((cmd) => (
          <button key={cmd.phrase} type="button" className={styles.commandCard} onClick={cmd.run}>
            <span className={styles.commandPhrase}>{cmd.phrase}</span>
            <span className={styles.commandDesc}>{cmd.desc}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

/* ===================== Keyboard mode ===================== */

function KeyboardPanel() {
  const rows = [
    { label: "Select an option", keys: ["A", "\u2013", "D"] },
    { label: "Re-read question", keys: ["Alt+R"] },
    { label: "Previous question", keys: ["Alt+P"] },
    { label: "Save & next", keys: ["Enter"] },
  ]

  return (
    <aside className={styles.wrap} aria-label="Keyboard shortcuts panel">
      <h2 className={styles.panelHeading}>
        <KeyboardIcon aria-hidden="true" /> Keyboard shortcuts
      </h2>
      <ul className={styles.kbList}>
        {rows.map((row) => (
          <li key={row.label} className={styles.kbRow}>
            <span className={styles.kbLabel}>{row.label}</span>
            <span className={styles.kbKeys}>
              {row.keys.map((key) => (
                <kbd key={key} className={styles.kbKey}>
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.kbNote}>No camera or microphone needed in this mode. Captions stay on below.</p>
    </aside>
  )
}
