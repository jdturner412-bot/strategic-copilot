import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-card',
  secondary: 'bg-panel text-ink border border-line',
  ghost: 'text-muted hover:text-ink',
  danger: 'bg-rose-500/15 text-rose-500 border border-rose-500/30',
}

const SIZES: Record<Size, string> = {
  md: 'px-5 py-3 text-lg rounded-2xl',
  lg: 'px-7 py-4 text-xl rounded-3xl',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'touch-target pressable inline-flex items-center justify-center gap-2.5 font-semibold',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'accent' | 'danger'
}

const TONES = {
  default: 'bg-panel text-ink border border-line',
  accent: 'bg-accent text-white',
  danger: 'bg-rose-500/15 text-rose-500 border border-rose-500/30',
}

export function IconButton({
  label, tone = 'default', className, children, ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'touch-target pressable inline-flex h-14 w-14 items-center justify-center rounded-2xl',
        'disabled:pointer-events-none disabled:opacity-40',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
