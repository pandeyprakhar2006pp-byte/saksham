export interface Question {
  q: string
  opts: string[]
  answer: number
}

export type PaletteStatus = "done" | "review" | "left"

export type ExamMode = "voice" | "sign" | "key"

export type MediaTab = "isl" | "cam"

export interface AccessibilityPrefs {
  contrast: boolean
  fontScale: number
  lowBandwidth: boolean
}

export type TimerStatus = "normal" | "warn" | "critical"
