"use client"

import { useCallback, useRef, useState } from "react"

interface GestureDemoState {
  progress: number
  label: string
  pillText: string
  detected: boolean
}

const TICK_MS = 100
const TOTAL_TICKS = 15
const DETECTED_LETTER = "B"
const IDLE_PILL_TEXT = "Waiting for a hand sign..."

const idleState: GestureDemoState = {
  progress: 0,
  label: "\u2014",
  pillText: IDLE_PILL_TEXT,
  detected: false,
}

export function useGestureDemo() {
  const [state, setState] = useState<GestureDemoState>(idleState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    let ticks = 0
    setState({ progress: 0, label: DETECTED_LETTER, pillText: `Detecting sign "${DETECTED_LETTER}"...`, detected: false })
    intervalRef.current = setInterval(() => {
      ticks += 1
      const progress = Math.min((ticks / TOTAL_TICKS) * 100, 100)
      if (progress >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        const confidence = 94 + Math.floor(Math.random() * 6)
        setState({
          progress: 100,
          label: DETECTED_LETTER,
          pillText: `Detected: ${DETECTED_LETTER} (Confidence: ${confidence}%) \u2192 Saved`,
          detected: true,
        })
      } else {
        setState((prev) => ({ ...prev, progress }))
      }
    }, TICK_MS)
  }, [])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState(idleState)
  }, [])

  return { ...state, start, reset }
}
