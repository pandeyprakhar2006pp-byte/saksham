"use client"

import { useEffect, useState } from "react"
import type { TimerStatus } from "@/types"

const WARN_THRESHOLD_SECONDS = 15 * 60
const CRITICAL_THRESHOLD_SECONDS = 5 * 60

export function useTimer(initialSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? prev : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  let status: TimerStatus = "normal"
  if (secondsLeft <= CRITICAL_THRESHOLD_SECONDS) status = "critical"
  else if (secondsLeft <= WARN_THRESHOLD_SECONDS) status = "warn"

  return { secondsLeft, formatted, status }
}
