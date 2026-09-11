import { CheckIcon, FlagIcon, PrevIcon, NextIcon, ReplayIcon, MicIcon } from "@/components/ui/icons"
import { QUESTIONS } from "@/config/questions"
import type { ExamMode, Question } from "@/types"
import styles from "./QuestionPanel.module.css"

interface QuestionPanelProps {
  question: Question
  questionNumber: number
  selected: number
  selectedVia: ExamMode
  onSelectOption: (index: number) => void
  onNext: () => void
  onPrev: () => void
  onMarkReview: () => void
  onReread: () => void
  onSpeakAnswer: () => void
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index)
}

const VIA_LABEL: Record<ExamMode, string> = {
  voice: "via voice",
  sign: "via sign",
  key: "via keyboard",
}

export function QuestionPanel({
  question,
  questionNumber,
  selected,
  selectedVia,
  onSelectOption,
  onNext,
  onPrev,
  onMarkReview,
  onReread,
  onSpeakAnswer,
}: QuestionPanelProps) {
  return (
    <section className={styles.wrap} aria-labelledby="question-heading">
      <div className={styles.meta}>
        <p className={styles.qNumber}>
          Question <strong>{String(questionNumber).padStart(2, "0")}</strong> of {QUESTIONS.length}
        </p>
        <span className={styles.typePill}>Single choice</span>
      </div>

      <h2 id="question-heading" className={styles.qText}>
        {question.q}
      </h2>

      <fieldset className={styles.options}>
        <legend className="sr-only">Answer options for question {questionNumber}</legend>
        {question.opts.map((opt, i) => {
          const isSelected = selected === i
          return (
            <label key={opt} className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}>
              <input
                type="radio"
                name="answer"
                value={i}
                checked={isSelected}
                onChange={() => onSelectOption(i)}
                className={styles.radioInput}
              />
              <span className={styles.letter} aria-hidden="true">
                {isSelected ? <CheckIcon /> : optionLetter(i)}
              </span>
              <span className={styles.optionText}>{opt}</span>
              {isSelected && <span className={styles.viaTag}>{VIA_LABEL[selectedVia]}</span>}
            </label>
          )
        })}
      </fieldset>

      <div className={styles.secondaryActions}>
        <button type="button" className={styles.chipBtn} onClick={onReread}>
          <ReplayIcon aria-hidden="true" /> Re-read question <kbd>Alt+R</kbd>
        </button>
        <button type="button" className={styles.chipBtn} onClick={onSpeakAnswer}>
          <MicIcon aria-hidden="true" /> Speak answer
        </button>
        <button type="button" className={styles.chipBtn} onClick={onMarkReview}>
          <FlagIcon aria-hidden="true" /> Mark for review
        </button>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.navBtn} onClick={onPrev}>
          <PrevIcon aria-hidden="true" /> Previous <kbd>Alt+P</kbd>
        </button>
        <button type="button" className={styles.nextBtn} onClick={onNext}>
          Save &amp; next <NextIcon aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
