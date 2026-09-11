"use client"

import { useCallback, useRef } from "react"
import type { Question } from "@/types"

interface SpeakOptions {
  rate?: number
  pitch?: number
}

const OPTION_LETTER_PITCH = 1.25

export function useTextToSpeech() {
  const supportedRef = useRef(typeof window !== "undefined" && "speechSynthesis" in window)

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => {
    if (!supportedRef.current) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "en-IN"
    utterance.rate = opts.rate ?? 1
    utterance.pitch = opts.pitch ?? 1
    window.speechSynthesis.speak(utterance)
  }, [])
  
  const readQuestion = useCallback((question: Question) => {
    if (!supportedRef.current) return
    window.speechSynthesis.cancel()
    const questionUtterance = new SpeechSynthesisUtterance(`Question. ${question.q}`)
    questionUtterance.lang = "en-IN"
    questionUtterance.pitch = 1
    window.speechSynthesis.speak(questionUtterance)
    question.opts.forEach((opt, i) => {
      const letterUtterance = new SpeechSynthesisUtterance(`Option ${String.fromCharCode(65 + i)}.`)
      letterUtterance.lang = "en-IN"
      letterUtterance.pitch = OPTION_LETTER_PITCH
      const optionUtterance = new SpeechSynthesisUtterance(opt)
      optionUtterance.lang = "en-IN"
      optionUtterance.pitch = 1
      window.speechSynthesis.speak(letterUtterance)
      window.speechSynthesis.speak(optionUtterance)
    })
  }, [])

  return { speak, readQuestion, supported: supportedRef.current }
}
