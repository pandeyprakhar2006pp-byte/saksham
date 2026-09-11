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

export interface LandmarkPoint {
  x: number
  y: number
  z: number
}

export type GestureDetectedShape =
  | "ONE_FINGER" // Index extended -> Option A
  | "TWO_FINGERS" // Index + Middle extended -> Option B
  | "THREE_FINGERS" // Index + Middle + Ring extended -> Option C
  | "FOUR_FINGERS" // 4 fingers extended -> Option D
  | "OPEN_PALM" // All 5 fingers extended -> Confirm / Submit
  | "FIST" // All fingers folded -> Neutral
  | "UNKNOWN"

export interface GestureClassificationResult {
  shape: GestureDetectedShape
  mappedOption: number | null // 0 for A, 1 for B, 2 for C, 3 for D, null otherwise
  mappedLetter: "A" | "B" | "C" | "D" | null
  isOpenPalm: boolean
  confidence: number // 0.0 to 1.0
  fingersExtended: {
    thumb: boolean
    index: boolean
    middle: boolean
    ring: boolean
    pinky: boolean
  }
}

export interface AnswerSubmissionPayload {
  sessionId: string
  questionId: string | number
  selectedOption: number
  mode: ExamMode
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface AnswerSubmissionResponse {
  success: boolean
  saved: boolean
  questionId: string | number
  selectedOption: number
  nextQuestion?: Question & { id: number; questionNumber: number }
  isFinished: boolean
  flaggedForReview: boolean
  reviewReason?: string
  message?: string
}
