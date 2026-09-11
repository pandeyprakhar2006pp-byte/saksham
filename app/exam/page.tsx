"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExamTopBar } from "@/components/ExamTopBar"
import { QuestionPalette } from "@/components/QuestionPalette"
import { AccessibilityBar } from "@/components/AccessibilityBar"
import { QuestionPanel } from "@/components/QuestionPanel"
import { MediaPanel } from "@/components/MediaPanel"
import { CaptionBar } from "@/components/CaptionBar"
import { LiveRegion } from "@/components/ui/LiveRegion"
import { useExamState } from "@/hooks/useExamState"
import { useTimer } from "@/hooks/useTimer"
import { useTextToSpeech } from "@/hooks/useTextToSpeech"
import { INITIAL_TIMER_SECONDS } from "@/config/questions"
import styles from "./exam.module.css"

export default function ExamPage() {
  const exam = useExamState()
  const timer = useTimer(INITIAL_TIMER_SECONDS)
  const tts = useTextToSpeech()
  const [sessionId] = useState(() => "saksham-session-2026")

  // ── Auto-read question whenever it changes (voice mode only) ──────────────
  // Also fires on initial mount because exam.current starts at 0.
  // A small delay lets any preceding action-confirmation TTS finish first.
  const isMountRef = useRef(true)
  useEffect(() => {
    if (exam.mode !== "voice") return
    // On mount, read immediately; on navigation give a short gap so
    // "saving answer" confirmation doesn't get cut off by the question read.
    const delay = isMountRef.current ? 0 : 600
    isMountRef.current = false
    const timer = setTimeout(() => {
      tts.readQuestion(exam.question)
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.current, exam.mode])

  // ── Action handlers with TTS confirmations (voice mode) ───────────────────

  const handleSelectOption = useCallback((index: number) => {
    exam.selectOption(index)
    if (exam.mode === "voice") {
      const letter = String.fromCharCode(65 + index)
      tts.speak(`Option ${letter} selected.`)
    }
  }, [exam, tts])

  const handleClearSelection = useCallback(() => {
    exam.clearSelection()
    if (exam.mode === "voice") {
      tts.speak("Answer cleared.")
    }
  }, [exam, tts])

  const handleMarkReview = useCallback(() => {
    exam.markReview()
    if (exam.mode === "voice") {
      tts.speak("Marked for review.")
    }
  }, [exam, tts])

  const handleGoNext = useCallback(() => {
    if (exam.mode === "voice") {
      tts.speak("Saving answer.")
    }
    exam.goNext()
  }, [exam, tts])

  const handleGoPrev = useCallback(() => {
    exam.goPrev()
  }, [exam])

  // ── Existing handlers ─────────────────────────────────────────────────────

  const handleReread = useCallback(() => {
    exam.reread()
    tts.readQuestion(exam.question)
  }, [exam, tts])

  const handleSpeakAnswer = useCallback(() => {
    if (exam.selected < 0) {
      tts.speak("No answer selected yet.")
      return
    }
    tts.speak(`Your answer: option ${exam.selected + 1}. ${exam.question.opts[exam.selected]}`)
  }, [tts, exam.selected, exam.question])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return

      const letterIndex = "abcd".indexOf(event.key.toLowerCase())
      if (!event.altKey && letterIndex >= 0 && letterIndex < exam.question.opts.length) {
        handleSelectOption(letterIndex)
        return
      }
      if (event.key >= "1" && event.key <= "4") {
        const index = Number(event.key) - 1
        if (index < exam.question.opts.length) handleSelectOption(index)
        return
      }
      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault()
        handleGoPrev()
        return
      }
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault()
        handleReread()
        return
      }
      switch (event.key) {
        case "Enter":
          handleGoNext()
          break
        case "ArrowRight":
          handleGoNext()
          break
        case "ArrowLeft":
          handleGoPrev()
          break
        case "m":
        case "M":
          handleMarkReview()
          break
        default:
          break
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [exam, handleSelectOption, handleGoPrev, handleGoNext, handleMarkReview, handleReread])

  return (
    <>
      <AccessibilityBar />
      <div className={styles.page}>
        <ExamTopBar questionNumber={exam.questionNumber} formattedTime={timer.formatted} timerStatus={timer.status} />
        <LiveRegion message={exam.captionText} />
        <div className={styles.body}>
          <QuestionPalette
            statuses={exam.statuses}
            current={exam.current}
            mode={exam.mode}
            onJump={exam.jumpTo}
            onModeChange={exam.setMode}
          />
          <main id="main" className={styles.main}>
            <p className={styles.hint}>
              Shortcuts: <kbd>A</kbd>-<kbd>D</kbd> select option, <kbd>Alt+P</kbd> previous,{" "}
              <kbd>Enter</kbd> save &amp; next, <kbd>M</kbd> mark for review, <kbd>Alt+R</kbd> read again.
            </p>
            <QuestionPanel
              question={exam.question}
              questionNumber={exam.questionNumber}
              selected={exam.selected}
              selectedVia={exam.selectedVia}
              onSelectOption={handleSelectOption}
              onNext={handleGoNext}
              onPrev={handleGoPrev}
              onMarkReview={handleMarkReview}
              onReread={handleReread}
              onSpeakAnswer={handleSpeakAnswer}
            />
          </main>
          <MediaPanel
            mode={exam.mode}
            question={exam.question}
            questionNumber={exam.questionNumber}
            sessionId={sessionId}
            islCaption={exam.islCaption}
            onGestureConfirmed={handleGoNext}
            onSelectOption={handleSelectOption}
            onClearAnswer={handleClearSelection}
            onNext={handleGoNext}
            onPrev={handleGoPrev}
            onMarkReview={handleMarkReview}
            onReread={handleReread}
            onSpeakAnswer={handleSpeakAnswer}
            onModeChange={exam.setMode}
          />
        </div>
        <CaptionBar text={exam.captionText} active={exam.mode !== "key"} />
      </div>
    </>
  )
}

