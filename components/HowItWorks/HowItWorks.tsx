import { Container } from "@/components/ui/Container"
import { FLOW_STEPS } from "@/config/landing"
import styles from "./HowItWorks.module.css"

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-heading">
      <Container>
        <div className={styles.header}>
          <p className={styles.eyebrow}>The flow</p>
          <h2 id="how-heading" className={styles.heading}>
            From login to submission
          </h2>
        </div>
        <ol className={styles.steps}>
          {FLOW_STEPS.map((step) => (
            <li key={step.num} className={styles.step}>
              <span className={styles.num} aria-hidden="true">
                {step.num}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
