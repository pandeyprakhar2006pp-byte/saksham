"use client"

import { createContext, type ReactNode } from "react"
import { useAccessibilityPrefs } from "@/hooks/useAccessibilityPrefs"
import type { AccessibilityPrefs } from "@/types"

export interface AccessibilityContextValue {
  prefs: AccessibilityPrefs
  toggleContrast: () => void
  increaseFontScale: () => void
  decreaseFontScale: () => void
  setLowBandwidth: (on: boolean) => void
}

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const value = useAccessibilityPrefs()
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}
