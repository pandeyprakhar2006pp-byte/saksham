import { Container } from "@/components/ui/Container"
import { AlertTriangleIcon, CheckIcon } from "@/components/ui/icons"
import { PROBLEM_POINTS, SOLUTION_POINTS } from "@/config/landing"
import styles from "./ChallengeSolution.module.css"

export function ChallengeSolution() {
  return (
    <section aria-label="The challenge and the solution">
      <Container>
        <div className={styles.split}>
          <div className={styles.grid}>
            <div className={`${styles.col} ${styles.problem}`}>
              <h3 className={styles.heading}>
                <span className={`${styles.ico} ${styles.icoProblem}`}>
                  <AlertTriangleIcon aria-hidden="true" />
                </span>
                The barrier
              </h3>
              <ul className={styles.list}>
                {PROBLEM_POINTS.map((point) => (
                  <li key={point.rest}>
                    {point.stat ? <span className={styles.stat}>{point.stat}</span> : null}
                    {point.rest}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.col} ${styles.solution}`}>
              <h3 className={styles.heading}>
                <span className={`${styles.ico} ${styles.icoSolution}`}>
                  <CheckIcon aria-hidden="true" />
                </span>
                The SAKSHAM way
              </h3>
              <ul className={styles.list}>
                {SOLUTION_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
