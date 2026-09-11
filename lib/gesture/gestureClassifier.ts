import type { GestureClassificationResult, GestureDetectedShape, LandmarkPoint } from "@/types"

/**
 * ============================================================================
 * SAKSHAM ISL HAND-GESTURE CLASSIFIER (GEOMETRIC HEURISTIC)
 * ============================================================================
 *
 * ARCHITECTURAL NOTE & PLACEHOLDER NOTICE:
 * This geometric finger-extension classifier calculates the extension state of
 * all 5 digits from MediaPipe's 21 3D landmarks (0 = wrist, 1-4 = thumb,
 * 5-8 = index, 9-12 = middle, 13-16 = ring, 17-20 = pinky).
 *
 * Current Mapping:
 * - 1 extended finger (Index)                     -> Option A (Index 0)
 * - 2 extended fingers (Index + Middle)            -> Option B (Index 1)
 * - 3 extended fingers (Index + Middle + Ring)     -> Option C (Index 2)
 * - 4 extended fingers (Index + Middle + Ring + Pinky) -> Option D (Index 3)
 * - 5 extended fingers (Open Palm / all 5 extended) -> CONFIRM / SUBMIT (Two-step verification)
 * - 0 fingers extended (Fist / Neutral)           -> NEUTRAL / IDLE
 *
 * IMPORTANT:
 * This finger-count mapping is an initial geometric heuristic placeholder for
 * real Indian Sign Language (ISL) fingerspelling. In formal ISL, alphabets have
 * distinct articulatory poses (e.g. 'A' is a closed fist with thumb upright/adjacent,
 * 'B' is flat vertical palm with thumb tucked, 'C' is a curved hand arch, 'D' is
 * index pointing up with thumb contacting finger tips).
 *
 * This module is purposefully structured with a standardized input/output contract
 * (`classifyHandLandmarks: LandmarkPoint[] -> GestureClassificationResult`) so that
 * a custom-trained machine learning classifier (e.g. TensorFlow.js, MediaPipe
 * GestureRecognizer model, or TFLite ISL classifier) can be dropped in as a replacement
 * with zero changes required in UI components, session state, or API endpoints.
 * ============================================================================
 */

// MediaPipe 21 Landmark Indices:
const WRIST = 0
const THUMB_CMC = 1
const THUMB_MCP = 2
const THUMB_IP = 3
const THUMB_TIP = 4

const INDEX_MCP = 5
const INDEX_PIP = 6
const INDEX_DIP = 7
const INDEX_TIP = 8

const MIDDLE_MCP = 9
const MIDDLE_PIP = 10
const MIDDLE_DIP = 11
const MIDDLE_TIP = 12

const RING_MCP = 13
const RING_PIP = 14
const RING_DIP = 15
const RING_TIP = 16

const PINKY_MCP = 17
const PINKY_PIP = 18
const PINKY_DIP = 19
const PINKY_TIP = 20

/**
 * Calculates Euclidean distance between two 3D landmarks
 */
function distance3D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  const dz = (p1.z ?? 0) - (p2.z ?? 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Determines whether a non-thumb finger is extended.
 * In image space, Y increases downwards (0 at top, 1 at bottom).
 * For an upright hand, tip.y is significantly smaller than pip.y and dip.y.
 * Also checks distance from wrist to tip vs wrist to pip to handle tilted hands.
 */
function isFingerExtended(
  tip: LandmarkPoint,
  dip: LandmarkPoint,
  pip: LandmarkPoint,
  mcp: LandmarkPoint,
  wrist: LandmarkPoint,
): boolean {
  // Check 1: Vertical positioning (tip is higher than pip and dip)
  const isHigher = tip.y < pip.y && tip.y < dip.y

  // Check 2: Radial distance from wrist (extended finger is further from wrist than PIP joint)
  const tipWristDist = distance3D(tip, wrist)
  const pipWristDist = distance3D(pip, wrist)
  const mcpWristDist = distance3D(mcp, wrist)

  const isDistExtended = tipWristDist > pipWristDist * 1.15 && tipWristDist > mcpWristDist * 1.3

  // Finger is extended if it passes radial extension or vertical height with positive margin
  return isDistExtended || (isHigher && tipWristDist > pipWristDist)
}

/**
 * Determines whether the thumb is extended.
 * Thumb moves laterally rather than purely vertically.
 * We measure the distance from thumb tip to pinky MCP base compared to IP to pinky base.
 */
function isThumbExtended(
  thumbTip: LandmarkPoint,
  thumbIp: LandmarkPoint,
  thumbMcp: LandmarkPoint,
  pinkyMcp: LandmarkPoint,
  wrist: LandmarkPoint,
): boolean {
  const tipToPinky = distance3D(thumbTip, pinkyMcp)
  const ipToPinky = distance3D(thumbIp, pinkyMcp)
  const mcpToPinky = distance3D(thumbMcp, pinkyMcp)

  const tipToWrist = distance3D(thumbTip, wrist)
  const mcpToWrist = distance3D(thumbMcp, wrist)

  // When thumb is extended out away from palm, distance to pinky base increases significantly
  return tipToPinky > ipToPinky * 1.1 && tipToPinky > mcpToPinky * 1.2 && tipToWrist > mcpToWrist * 1.1
}

/**
 * Classifies the 21 MediaPipe hand landmarks into a gesture result.
 */
export function classifyHandLandmarks(landmarks: LandmarkPoint[] | null | undefined): GestureClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      shape: "UNKNOWN",
      mappedOption: null,
      mappedLetter: null,
      isOpenPalm: false,
      confidence: 0,
      fingersExtended: {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      },
    }
  }

  const wrist = landmarks[WRIST]
  const pinkyMcp = landmarks[PINKY_MCP]

  const indexExt = isFingerExtended(
    landmarks[INDEX_TIP],
    landmarks[INDEX_DIP],
    landmarks[INDEX_PIP],
    landmarks[INDEX_MCP],
    wrist,
  )

  const middleExt = isFingerExtended(
    landmarks[MIDDLE_TIP],
    landmarks[MIDDLE_DIP],
    landmarks[MIDDLE_PIP],
    landmarks[MIDDLE_MCP],
    wrist,
  )

  const ringExt = isFingerExtended(
    landmarks[RING_TIP],
    landmarks[RING_DIP],
    landmarks[RING_PIP],
    landmarks[RING_MCP],
    wrist,
  )

  const pinkyExt = isFingerExtended(
    landmarks[PINKY_TIP],
    landmarks[PINKY_DIP],
    landmarks[PINKY_PIP],
    landmarks[PINKY_MCP],
    wrist,
  )

  const thumbExt = isThumbExtended(
    landmarks[THUMB_TIP],
    landmarks[THUMB_IP],
    landmarks[THUMB_MCP],
    pinkyMcp,
    wrist,
  )

  const extendedCount = [thumbExt, indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length
  const nonThumbExtendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length

  // Hand scale estimation for confidence calculation (wrist to middle MCP distance)
  const palmScale = distance3D(wrist, landmarks[MIDDLE_MCP])
  const baseConfidence = Math.min(1.0, Math.max(0.65, palmScale * 3.5))

  // 1. OPEN PALM (Confirmation Gesture): All 5 digits extended (or at least 4 digits including thumb & index)
  if (extendedCount >= 5 || (nonThumbExtendedCount === 4 && thumbExt)) {
    return {
      shape: "OPEN_PALM",
      mappedOption: null,
      mappedLetter: null,
      isOpenPalm: true,
      confidence: Math.round(baseConfidence * 98) / 100,
      fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
    }
  }

  // 2. OPTION A (Index Finger Extended): 1 finger extended
  if ((nonThumbExtendedCount === 1 && indexExt) || (extendedCount === 1 && indexExt)) {
    return {
      shape: "ONE_FINGER",
      mappedOption: 0,
      mappedLetter: "A",
      isOpenPalm: false,
      confidence: Math.round(baseConfidence * 95) / 100,
      fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
    }
  }

  // 3. OPTION B (Index + Middle Extended / Peace sign): 2 fingers extended
  if (nonThumbExtendedCount === 2 && indexExt && middleExt && !ringExt && !pinkyExt) {
    return {
      shape: "TWO_FINGERS",
      mappedOption: 1,
      mappedLetter: "B",
      isOpenPalm: false,
      confidence: Math.round(baseConfidence * 96) / 100,
      fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
    }
  }

  // 4. OPTION C (Index + Middle + Ring Extended): 3 fingers extended
  if (nonThumbExtendedCount === 3 && indexExt && middleExt && ringExt && !pinkyExt) {
    return {
      shape: "THREE_FINGERS",
      mappedOption: 2,
      mappedLetter: "C",
      isOpenPalm: false,
      confidence: Math.round(baseConfidence * 92) / 100,
      fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
    }
  }

  // 5. OPTION D (Index + Middle + Ring + Pinky Extended with Thumb Folded): 4 fingers extended
  if (nonThumbExtendedCount === 4 && !thumbExt) {
    return {
      shape: "FOUR_FINGERS",
      mappedOption: 3,
      mappedLetter: "D",
      isOpenPalm: false,
      confidence: Math.round(baseConfidence * 93) / 100,
      fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
    }
  }

  // 6. FIST / NEUTRAL: 0 fingers extended
  if (extendedCount === 0) {
    return {
      shape: "FIST",
      mappedOption: null,
      mappedLetter: null,
      isOpenPalm: false,
      confidence: 0.9,
      fingersExtended: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    }
  }

  // Ambiguous / transitional pose
  return {
    shape: "UNKNOWN",
    mappedOption: null,
    mappedLetter: null,
    isOpenPalm: false,
    confidence: 0.4,
    fingersExtended: { thumb: thumbExt, index: indexExt, middle: middleExt, ring: ringExt, pinky: pinkyExt },
  }
}
