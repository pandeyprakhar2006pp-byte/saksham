"use client"

import { useCallback, useEffect, useState } from "react"
import type { AccessibilityPrefs } from "@/types"

const STORAGE_KEY = "saksham-accessibility-prefs"
const MIN_FONT_SCALE = 0.85
const MAX_FONT_SCALE = 1.5
const FONT_SCALE_STEP = 0.1

const DEFAULT_PREFS: AccessibilityPrefs = {
  contrast: false,
  fontScale: 1,
  lowBandwidth: false,
}

function readStoredPrefs(): AccessibilityPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>
    return {
      contrast: parsed.contrast ?? DEFAULT_PREFS.contrast,
      fontScale: parsed.fontScale ?? DEFAULT_PREFS.fontScale,
      lowBandwidth: parsed.lowBandwidth ?? DEFAULT_PREFS.lowBandwidth,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPrefs(readStoredPrefs())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    document.body.setAttribute("data-contrast", prefs.contrast ? "high" : "normal")
    document.documentElement.style.setProperty("--font-scale", prefs.fontScale.toFixed(2))
    document.documentElement.style.setProperty("--motion-scale", prefs.lowBandwidth ? "9999" : "1")
  }, [prefs, hydrated])

  const toggleContrast = useCallback(() => {
    setPrefs((prev) => ({ ...prev, contrast: !prev.contrast }))
  }, [])

  const increaseFontScale = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      fontScale: Math.min(MAX_FONT_SCALE, Math.round((prev.fontScale + FONT_SCALE_STEP) * 100) / 100),
    }))
  }, [])

  const decreaseFontScale = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      fontScale: Math.max(MIN_FONT_SCALE, Math.round((prev.fontScale - FONT_SCALE_STEP) * 100) / 100),
    }))
  }, [])

  const setLowBandwidth = useCallback((on: boolean) => {
    setPrefs((prev) => ({ ...prev, lowBandwidth: on }))
  }, [])

  return { prefs, toggleContrast, increaseFontScale, decreaseFontScale, setLowBandwidth }
}
