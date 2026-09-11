"use client"

import { useEffect, useRef, useState } from "react"
import { ClosedCaptionIcon } from "@/components/ui/icons"
import styles from "./CaptionBar.module.css"

interface CaptionBarProps {
  text: string
  active: boolean
}

export function CaptionBar({ text, active }: CaptionBarProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active || !text) {
      setVisible(false)
      return
    }
    setVisible(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(false), 4500)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [text, active])

  if (!active) return null

  return (
    <div className={styles.wrap} data-visible={visible} role="status" aria-live="polite">
      <div className={styles.inner}>
        <ClosedCaptionIcon aria-hidden="true" className={styles.icon} />
        <p className={styles.text}>{text || "Captions will appear here as content is read aloud."}</p>
      </div>
    </div>
  )
}
