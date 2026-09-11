import { Container } from "@/components/ui/Container"
import { FEATURE_CARDS } from "@/config/landing"
import { MicIcon, VideoIcon, HandIcon } from "@/components/ui/icons"
import styles from "./FeatureGrid.module.css"

const ICONS = {
  MicIcon,
  VideoIcon,
  HandIcon,
} as const

export function FeatureGrid() {
  return (
    <section className={styles.section} id="features" aria-labelledby="features-heading">
      <Container>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Three ways in</p>
          <h2 id="features-heading" className={styles.heading}>
            Built for the way you already work
          </h2>
        </div>
        <div className={styles.grid}>
          {FEATURE_CARDS.map((card) => {
            const Icon = ICONS[card.icon]
            return (
              <article key={card.title} className={`${styles.card} ${styles[card.accent]}`}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDesc}>{card.description}</p>
              </article>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
