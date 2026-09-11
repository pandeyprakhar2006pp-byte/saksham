import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./Button.module.css"

type ButtonVariant = "primary" | "ghost"
type ButtonSize = "default" | "sm"

interface SharedProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

function variantClass(variant: ButtonVariant, size: ButtonSize) {
  const classes = [styles.btn, variant === "primary" ? styles.primary : styles.ghost]
  if (size === "sm") classes.push(styles.sm)
  return classes.join(" ")
}

type LinkButtonProps = SharedProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export function LinkButton({ variant = "primary", size = "default", children, className, href, ...rest }: LinkButtonProps) {
  const combined = className ? `${variantClass(variant, size)} ${className}` : variantClass(variant, size)
  return (
    <a href={href} className={combined} {...rest}>
      {children}
    </a>
  )
}

type ButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ variant = "primary", size = "default", children, className, type = "button", ...rest }: ButtonProps) {
  const combined = className ? `${variantClass(variant, size)} ${className}` : variantClass(variant, size)
  return (
    <button type={type} className={combined} {...rest}>
      {children}
    </button>
  )
}
