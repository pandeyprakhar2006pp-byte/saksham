import { EXAM_NAME, QUESTIONS } from "@/config/questions"
import type { TimerStatus } from "@/types"
import styles from "./ExamTopBar.module.css"

interface ExamTopBarProps {
  questionNumber: number
  formattedTime: string
  timerStatus: TimerStatus
}

export function ExamTopBar({ questionNumber, formattedTime, timerStatus }: ExamTopBarProps) {
  return (
    <header className={styles.bar} role="banner">
      <div className={styles.left}>
        <span className={styles.mark}>SK</span>
        <div>
          <p className={styles.exam}>{EXAM_NAME}</p>
          <p className={styles.progress}>
            Question {questionNumber} of {QUESTIONS.length}
          </p>
        </div>
      </div>
      <div className={styles.right}>
        <span
          className={`${styles.timer} ${styles[timerStatus]}`}
          role="timer"
          aria-label={`Time remaining ${formattedTime}`}
        >
          {formattedTime}
        </span>
        <button type="button" className={styles.submit}>
          Submit exam
        </button>
      </div>
    </header>
  )
}
