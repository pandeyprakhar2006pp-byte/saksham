import type { ElementType, ReactNode } from "react"
import styles from "./Container.module.css"

interface ContainerProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function Container({ as: Tag = "div", className, children }: ContainerProps) {
  const combined = className ? `${styles.wrap} ${className}` : styles.wrap
  return <Tag className={combined}>{children}</Tag>
}
