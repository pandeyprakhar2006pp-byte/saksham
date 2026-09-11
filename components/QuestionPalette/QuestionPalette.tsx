import { PALETTE_SIZE } from "@/config/questions"
import { ModeSwitcher } from "@/components/ModeSwitcher"
import type { ExamMode, PaletteStatus } from "@/types"
import styles from "./QuestionPalette.module.css"

interface QuestionPaletteProps {
  statuses: PaletteStatus[]
  current: number
  mode: ExamMode
  onJump: (index: number) => void
  onModeChange: (mode: ExamMode) => void
}

const LEGEND: { key: string; swatchClass: string; label: string }[] = [
  { key: "done", swatchClass: "done", label: "Answered" },
  { key: "review", swatchClass: "review", label: "Marked for review" },
  { key: "left", swatchClass: "left", label: "Not visited" },
  { key: "current", swatchClass: "currentSwatch", label: "Current question" },
]

export function QuestionPalette({ statuses, current, mode, onJump, onModeChange }: QuestionPaletteProps) {
  return (
    <nav className={styles.wrap} aria-label="Exam controls">
      <section className={styles.section} aria-label="Answer input mode">
        <h2 className={styles.heading}>Answer mode</h2>
        <ModeSwitcher mode={mode} onChange={onModeChange} />
      </section>

      <section className={styles.section} aria-label="Question palette">
        <h2 className={styles.heading}>Question palette</h2>
        <div className={styles.grid} role="group" aria-label="Jump to question">
          {Array.from({ length: PALETTE_SIZE }, (_, i) => {
            const status = statuses[i]
            const isCurrent = i === current
            return (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i)}
                className={`${styles.cell} ${styles[status]} ${isCurrent ? styles.current : ""}`}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Question ${i + 1}, ${status === "done" ? "answered" : status === "review" ? "marked for review" : "not visited"}${isCurrent ? ", current question" : ""}`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            )
          })}
        </div>
        <ul className={styles.legend}>
          {LEGEND.map((item) => (
            <li key={item.key} className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles[item.swatchClass]}`} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </section>
    </nav>
  )
}
