import { MicIcon, SignLanguageIcon, KeyboardIcon } from "@/components/ui/icons"
import type { ExamMode } from "@/types"
import styles from "./ModeSwitcher.module.css"

interface ModeSwitcherProps {
  mode: ExamMode
  onChange: (mode: ExamMode) => void
}

const MODES: { id: ExamMode; label: string; Icon: typeof MicIcon }[] = [
  { id: "voice", label: "Voice", Icon: MicIcon },
  { id: "sign", label: "Sign gesture", Icon: SignLanguageIcon },
  { id: "key", label: "Keyboard", Icon: KeyboardIcon },
]

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className={styles.wrap} role="radiogroup" aria-label="Answer input mode">
      {MODES.map(({ id, label, Icon }) => {
        const isActive = mode === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.btn} ${isActive ? styles.active : ""}`}
            onClick={() => onChange(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
