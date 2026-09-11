"use client"

import { useEffect, useState } from "react"
import { Container } from "@/components/ui/Container"
import { LiveRegion } from "@/components/ui/LiveRegion"
import { ContrastIcon, ScreenReaderIcon } from "@/components/ui/icons"
import { useAccessibilityContext } from "@/hooks/useAccessibilityContext"
import { useLiveAnnouncer } from "@/hooks/useLiveAnnouncer"
import styles from "./AccessibilityBar.module.css"

const MAX_FONT_SCALE = 1.5
const MIN_FONT_SCALE = 0.85
const FONT_SCALE_STEP = 0.1

export function AccessibilityBar() {
  const { prefs, toggleContrast, increaseFontScale, decreaseFontScale } = useAccessibilityContext()
  const { message, announce } = useLiveAnnouncer()
  const [readerOn, setReaderOn] = useState(false)

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault()
        handleContrastClick()
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  })

  function handleContrastClick() {
    const willBeOn = !prefs.contrast
    toggleContrast()
    announce(willBeOn ? "High contrast mode on" : "High contrast mode off")
  }

  function handleReaderClick() {
    const willBeOn = !readerOn
    setReaderOn(willBeOn)
    announce(willBeOn ? "Screen reader friendly mode on" : "Screen reader friendly mode off")
  }

  function handleFontUp() {
    const next = Math.min(MAX_FONT_SCALE, Math.round((prefs.fontScale + FONT_SCALE_STEP) * 100) / 100)
    increaseFontScale()
    announce(`Text size ${Math.round(next * 100)} percent`)
  }

  function handleFontDown() {
    const next = Math.max(MIN_FONT_SCALE, Math.round((prefs.fontScale - FONT_SCALE_STEP) * 100) / 100)
    decreaseFontScale()
    announce(`Text size ${Math.round(next * 100)} percent`)
  }

  return (
    <div className={styles.bar} role="region" aria-label="Accessibility controls">
      <Container className={styles.inner}>
        <button className={styles.a11yBtn} aria-pressed={prefs.contrast} type="button" onClick={handleContrastClick}>
          <ContrastIcon aria-hidden="true" />
          High contrast <span className={styles.hint}>Alt+C</span>
        </button>
        <div className={styles.fsGroup} role="group" aria-label="Text size">
          <button type="button" aria-label="Decrease text size" onClick={handleFontDown}>
            A&minus;
          </button>
          <button type="button" aria-label="Increase text size" onClick={handleFontUp}>
            A+
          </button>
        </div>
        <button className={styles.a11yBtn} aria-pressed={readerOn} type="button" onClick={handleReaderClick}>
          <ScreenReaderIcon aria-hidden="true" />
          Screen reader
        </button>
        <div className={styles.spacer} />
        <span className={styles.hint}>This bar changes the whole page, live.</span>
      </Container>
      <LiveRegion message={message} />
    </div>
  )
}
