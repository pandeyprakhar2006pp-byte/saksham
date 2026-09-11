"use client"

import { useContext } from "react"
import { AccessibilityContext } from "@/components/AccessibilityProvider"

export function useAccessibilityContext() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) {
    throw new Error("useAccessibilityContext must be used within an AccessibilityProvider")
  }
  return ctx
}
