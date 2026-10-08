import { Container } from "@/components/ui/Container"
import { LinkButton } from "@/components/ui/Button"
import { WatchIcon, ArrowRightIcon } from "@/components/ui/icons"
import styles from "./Hero.module.css"

export function Hero() {
  return (
    <section className={styles.hero} id="home">
      <Container className={styles.grid}>
        <div>
          <span className={styles.eyebrow}>Team Stag &middot; Inclusive Exam System</span>
          <h1 className={styles.heading}>
            Empowering every mind<span className={styles.accent}>.</span>
          </h1>
          <p className={styles.sub}>
            An inclusive digital exam platform. Saksham lets visually and hearing impaired candidates sit
            a real exam on their own terms, no scribe to book, no interpreter to schedule, no wait.
          </p>
          <div className={styles.actions}>
            <LinkButton href="#features" variant="ghost">
              <WatchIcon aria-hidden="true" /> Watch the ISL intro
            </LinkButton>
            <LinkButton href="/exam" variant="primary">
              Try the demo exam <ArrowRightIcon aria-hidden="true" />
            </LinkButton>
          </div>
        </div>

        <div className={styles.panel} aria-hidden="true">
          <div className={styles.panelRow}>
            <span className={styles.tag}>Question 04 of 25</span>
            <span className={styles.tag}>44:12 left</span>
          </div>
          <p className={styles.q}>What is the chemical formula of water?</p>
          <div className={styles.opt}>
            <span className={styles.dot} />
            H2O2
          </div>
          <div className={`${styles.opt} ${styles.optSelected}`}>
            <span className={styles.dot}>&#10003;</span>
            H2O
          </div>
          <div className={styles.opt}>
            <span className={styles.dot} />
            CO2
          </div>
          <div className={styles.opt}>
            <span className={styles.dot} />
            NaCl
          </div>
          <div className={styles.status}>
            <span className={styles.pulse} /> Sign detected: &quot;B&quot; &middot; confirmed in 1.5s
          </div>
        </div>
      </Container>
    </section>
  )
}
