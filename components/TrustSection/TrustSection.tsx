import { Container } from "@/components/ui/Container"
import { TRUST_CARDS, TECH_ITEMS } from "@/config/landing"
import { GlobeIcon, ShieldIcon, LockIcon } from "@/components/ui/icons"
import styles from "./TrustSection.module.css"

const ICONS = { GlobeIcon, ShieldIcon, LockIcon } as const

export function TrustSection() {
  return (
    <section className={styles.section} id="impact" aria-labelledby="trust-heading">
      <Container>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Reliability &amp; compliance</p>
          <h2 id="trust-heading" className={styles.heading}>
            Trusted infrastructure, not a prototype
          </h2>
        </div>

        <div className={styles.cards}>
          {TRUST_CARDS.map((card) => {
            const Icon = ICONS[card.icon]
            return (
              <article key={card.title} className={styles.card}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDesc}>{card.description}</p>
              </article>
            )
          })}
        </div>

        <div className={styles.stack}>
          <h3 className={styles.stackHeading}>Under the hood</h3>
          <dl className={styles.stackList}>
            {TECH_ITEMS.map((item) => (
              <div key={item.label} className={styles.stackItem}>
                <dt className={styles.stackLabel}>{item.label}</dt>
                <dd className={styles.stackValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  )
}
