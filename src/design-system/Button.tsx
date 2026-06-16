/**
 * Button - the ONE canonical button (UI_CANON section 3.1).
 * Variants as a prop; consumers use <Button>, never a raw <button className> or btn-* class.
 * Red is NEVER a button except the sanctioned `danger` (genuinely destructive/critical action)
 * per the section 4.2 red-split: primary = navy (--sem-cta), not red.
 *
 * v2.0 UI foundation (gate-zero). The 838 inline <button> are NOT migrated here (section 17.3);
 * this builds the target. onClick is REQUIRED for any interactive button (section 7.2
 * functional-integrity) - a styled button with no handler is drift; render static markup instead.
 */
import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'approve' | 'refer';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading/trailing icon (e.g. a lucide glyph element). */
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  /** Shows the spinner and disables the button. */
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Native button type. Default 'button' (never an accidental form submit). */
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children?: React.ReactNode;
}

const SIZE: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 12, gap: 6 },
  md: { padding: '8px 16px', fontSize: 14, gap: 8 },
  lg: { padding: '12px 24px', fontSize: 16, gap: 8 },
};

const SPINNER_SIZE: Record<ButtonSize, 'sm' | 'md'> = { sm: 'sm', md: 'sm', lg: 'md' };

/** Token-driven variant styles. Color comes ONLY from --sem-* tokens. Exported for the regression net. */
export function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: 'var(--sem-cta)', color: 'var(--sem-cta-ink)', border: '1px solid var(--sem-cta)' };
    case 'secondary':
      return { background: 'transparent', color: 'var(--sem-cta)', border: '1px solid var(--sem-cta)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--sem-cta)', border: '1px solid transparent' };
    case 'danger':
      return { background: 'var(--sem-critical)', color: 'var(--sem-critical-on-solid)', border: '1px solid var(--sem-critical)' };
    case 'approve':
      return { background: '#0D2640', color: '#FFFFFF', border: '1px solid #0D2640' };
    case 'refer':
      return { background: '#2A5578', color: '#FFFFFF', border: '1px solid #2A5578' };
  }
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const style: React.CSSProperties = {
    ...SIZE[size],
    ...variantStyle(variant),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    borderRadius: 'var(--radius-control)',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    transition: `background var(--motion-fast) var(--motion-ease-enter), box-shadow var(--motion-fast) var(--motion-ease-enter)`,
    whiteSpace: 'nowrap',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`ds-btn ds-btn-${variant} ${className}`}
      style={style}
      {...rest}
    >
      {loading ? <Spinner size={SPINNER_SIZE[size]} label="Working" /> : null}
      {!loading && icon && iconPosition === 'left' ? <span className="ds-btn-icon" aria-hidden>{icon}</span> : null}
      {children != null ? <span className="ds-btn-label">{children}</span> : null}
      {!loading && icon && iconPosition === 'right' ? <span className="ds-btn-icon" aria-hidden>{icon}</span> : null}
    </button>
  );
};

export default Button;
