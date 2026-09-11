import { Container } from "@/components/ui/Container"
import { LinkButton } from "@/components/ui/Button"
import styles from "./Footer.module.css"

export function Footer() {
  return (
    <footer className={styles.footer} id="contact">
      <Container className={styles.inner}>
        <div>
          <p className={styles.brand}>SAKSHAM</p>
          <p className={styles.tagline}>Built for Smart India Hackathon 2026 by Team Stag.</p>
        </div>
        <div className={styles.ctaBlock}>
          <p className={styles.ctaText}>Want to see it in action?</p>
          <LinkButton href="/exam" variant="primary" size="sm">
            Try the demo exam
          </LinkButton>
        </div>
      </Container>
      <Container>
        <p className={styles.legal}>
          Demo build. No real candidate data is collected or stored by this preview.
        </p>
      </Container>
    </footer>
  )
}
