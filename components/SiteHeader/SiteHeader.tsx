import { Container } from "@/components/ui/Container"
import { LinkButton } from "@/components/ui/Button"
import { NAV_LINKS } from "@/config/landing"
import styles from "./SiteHeader.module.css"

export function SiteHeader() {
  return (
    <header className={styles.site}>
      <Container as="nav" aria-label="Primary" className={styles.nav}>
        <a href="#main" className={styles.logo}>
          <span className={styles.mark}>SK</span> SAKSHAM
        </a>
        <div className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <div className={styles.navCta}>
          <LinkButton href="/exam" size="sm">
            Try the demo exam
          </LinkButton>
        </div>
      </Container>
    </header>
  )
}
