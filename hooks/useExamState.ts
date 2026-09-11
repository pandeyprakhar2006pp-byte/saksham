"use client"

import { useCallback, useReducer } from "react"
import { INITIAL_PALETTE_STATUSES, INITIAL_QUESTION_INDEX, PALETTE_SIZE, QUESTIONS } from "@/config/questions"
import type { ExamMode, PaletteStatus, Question } from "@/types"

interface ExamState {
  current: number
  statuses: PaletteStatus[]
  answers: Record<number, number>
  selected: number
  selectedVia: ExamMode
  mode: ExamMode
  captionText: string
  islCaption: string
}

type ExamAction =
  | { type: "SELECT_OPTION"; index: number; mode: ExamMode }
  | { type: "CLEAR_SELECTION" }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "MARK_REVIEW" }
  | { type: "JUMP"; paletteIndex: number }
  | { type: "SET_MODE"; mode: ExamMode }
  | { type: "REREAD" }

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function currentQuestion(current: number): Question {
  return QUESTIONS[current % QUESTIONS.length]
}

function renderCaptions(current: number, selected: number) {
  const data = currentQuestion(current)
  const displayNumber = (current % PALETTE_SIZE) + 1
  const selectedText =
    selected >= 0 && selected < data.opts.length
      ? ` Option ${optionLetter(selected)}: ${data.opts[selected]}, selected.`
      : ""
  return {
    captionText: `Question ${displayNumber}: ${data.q}${selectedText}`,
    islCaption: `Signing: "${data.q}"`,
  }
}

function createInitialState(): ExamState {
  const initialAnswers: Record<number, number> = {}
  const initialSelected = -1
  const captions = renderCaptions(INITIAL_QUESTION_INDEX, initialSelected)
  return {
    current: INITIAL_QUESTION_INDEX,
    statuses: [...INITIAL_PALETTE_STATUSES],
    answers: initialAnswers,
    selected: initialSelected,
    selectedVia: "voice",
    mode: "voice",
    captionText: captions.captionText,
    islCaption: captions.islCaption,
  }
}

function reducer(state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case "SELECT_OPTION": {
      const data = currentQuestion(state.current)
      const answers = { ...state.answers, [state.current]: action.index }
      return {
        ...state,
        answers,
        selected: action.index,
        selectedVia: action.mode,
        captionText: `Option ${optionLetter(action.index)}: ${data.opts[action.index]}, selected.`,
      }
    }
    case "CLEAR_SELECTION": {
      const answers = { ...state.answers, [state.current]: -1 }
      return { ...state, answers, selected: -1, captionText: "Answer cleared." }
    }
    case "NEXT": {
      const statuses = [...state.statuses]
      if (state.selected >= 0) {
        statuses[state.current] = "done"
      }
      const nextCurrent = (state.current + 1) % QUESTIONS.length
      const nextSelected = state.answers[nextCurrent] ?? -1
      return {
        ...state,
        statuses,
        current: nextCurrent,
        selected: nextSelected,
        selectedVia: state.mode,
        ...renderCaptions(nextCurrent, nextSelected),
      }
    }
    case "PREV": {
      const prevCurrent = (state.current - 1 + QUESTIONS.length) % QUESTIONS.length
      const prevSelected = state.answers[prevCurrent] ?? -1
      return {
        ...state,
        current: prevCurrent,
        selected: prevSelected,
        selectedVia: state.mode,
        ...renderCaptions(prevCurrent, prevSelected),
      }
    }
    case "MARK_REVIEW": {
      const statuses = [...state.statuses]
      statuses[state.current] = "review"
      return { ...state, statuses }
    }
    case "JUMP": {
      const nextCurrent = action.paletteIndex % QUESTIONS.length
      const nextSelected = state.answers[nextCurrent] ?? -1
      return {
        ...state,
        current: nextCurrent,
        selected: nextSelected,
        selectedVia: state.mode,
        ...renderCaptions(nextCurrent, nextSelected),
      }
    }
    case "SET_MODE":
      return { ...state, mode: action.mode }
    case "REREAD": {
      const data = currentQuestion(state.current)
      return { ...state, captionText: `Re-reading: ${data.q}` }
    }
    default:
      return state
  }
}

export function useExamState() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const selectOption = useCallback(
    (index: number) => dispatch({ type: "SELECT_OPTION", index, mode: state.mode }),
    [state.mode],
  )
  const clearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), [])
  const goNext = useCallback(() => dispatch({ type: "NEXT" }), [])
  const goPrev = useCallback(() => dispatch({ type: "PREV" }), [])
  const markReview = useCallback(() => dispatch({ type: "MARK_REVIEW" }), [])
  const jumpTo = useCallback((paletteIndex: number) => dispatch({ type: "JUMP", paletteIndex }), [])
  const setMode = useCallback((mode: ExamMode) => dispatch({ type: "SET_MODE", mode }), [])
  const reread = useCallback(() => dispatch({ type: "REREAD" }), [])

  const question = currentQuestion(state.current)
  const questionNumber = (state.current % PALETTE_SIZE) + 1

  return {
    ...state,
    question,
    questionNumber,
    selectOption,
    clearSelection,
    goNext,
    goPrev,
    markReview,
    jumpTo,
    setMode,
    reread,
  }
}
