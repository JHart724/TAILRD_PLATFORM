import React from 'react';

/**
 * Canonical TAILRD | HEART logo.
 *  - 'full'     : the real brand image (public/tailrd-heart-logo.png), a white-background raster.
 *                 Used ONLY on the login hero (a white card). The raster reads badly boxed on any
 *                 in-app surface (color blocks on the navy sidebar, cheap-looking on the light
 *                 dashboard), so every in-app site uses the wordmark instead (AUDIT-304 correction).
 *  - 'wordmark' : the single canonical chrome text treatment reading "TAILRD | HEART". This is the
 *                 in-app brand mark (sidebar, dashboard hero, loaders, admin, auth panels).
 *
 * `surface` selects a background-aware color set so the gradient text stays legible on BOTH the dark
 * navy chrome (sidebar / dark auth heroes -> light gradients) and the light frosted in-app surfaces
 * (dashboard / loaders / white panels -> deep gradients).
 *
 * NOTE on the gradient-text technique: the `background` shorthand MUST be written BEFORE the
 * `background-clip: text` longhands. If the shorthand comes after, it resets background-clip to
 * border-box and the gradient renders as a solid rectangle behind transparent text (the "color
 * blocks" artifact). buildGradientText enforces that ordering.
 */
const LOGO_SRC = `${process.env.PUBLIC_URL}/tailrd-heart-logo.png`;

export type LogoVariant = 'full' | 'wordmark';
export type LogoSize = 'small' | 'medium' | 'large';
export type LogoSurface = 'dark' | 'light';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** Background the wordmark sits on: 'dark' = navy/dark heroes (light text), 'light' = white/frosted (dark text). */
  surface?: LogoSurface;
  /** Optional tagline rendered under the logo. */
  tagline?: string;
  className?: string;
}

const IMG_HEIGHT: Record<LogoSize, string> = {
  small: 'h-8',
  medium: 'h-12',
  large: 'h-16',
};

const TEXT: Record<LogoSize, { size: string; gap: string }> = {
  small: { size: '20px', gap: '8px' },
  medium: { size: '36px', gap: '12px' },
  large: { size: '48px', gap: '16px' },
};

// Background-aware wordmark colors. TAILRD = chrome/silver gradient, HEART = arterial red.
//  - dark:  light gradients, for dark navy / dark red backgrounds.
//  - light: deep saturated gradients, legible on white / light frosted backgrounds.
const WORDMARK_COLORS: Record<LogoSurface, { tailrd: string; heart: string; pipe: string }> = {
  dark: {
    tailrd: 'linear-gradient(135deg, #C8D4DC 0%, #8FA8BC 40%, #F0F5FA 60%, #C8D4DC 100%)',
    heart: 'linear-gradient(135deg, #E8A0A8 0%, #D94452 50%, #F0B8BE 100%)',
    pipe: 'rgba(200, 212, 220, 0.5)',
  },
  light: {
    tailrd: 'linear-gradient(135deg, #0D2640 0%, #2C4A60 40%, #3D6F94 75%, #5A8AB0 100%)',
    heart: 'linear-gradient(135deg, #7A1A2E 0%, #9B2438 50%, #C13346 100%)',
    pipe: 'rgba(44, 74, 96, 0.55)',
  },
};

// Build the gradient-text style with the `background` shorthand FIRST so the following
// background-clip: text longhands win (see NOTE above). This is what clips the gradient to the
// glyphs instead of filling a solid block.
function buildGradientText(gradient: string, fontSize: string): React.CSSProperties {
  return {
    fontSize,
    fontWeight: 700,
    letterSpacing: '0.05em',
    fontFamily: "'Playfair Display', Georgia, serif",
    lineHeight: 1.1,
    background: gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };
}

const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'medium',
  surface = 'dark',
  tagline,
  className = '',
}) => {
  const colors = WORDMARK_COLORS[surface];
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {variant === 'full' ? (
        <img
          src={LOGO_SRC}
          alt="TAILRD | HEART"
          className={`${IMG_HEIGHT[size]} w-auto object-contain`}
        />
      ) : (
        <div className="inline-flex items-center" style={{ gap: TEXT[size].gap }}>
          {/* TAILRD - chrome/silver gradient */}
          <span style={buildGradientText(colors.tailrd, TEXT[size].size)}>TAILRD</span>
          {/* Canonical pipe separator */}
          <span style={{ fontSize: TEXT[size].size, fontWeight: 300, color: colors.pipe, lineHeight: 1 }}>|</span>
          {/* HEART - arterial red gradient */}
          <span style={buildGradientText(colors.heart, TEXT[size].size)}>HEART</span>
        </div>
      )}
      {tagline && (
        <p className="text-sm text-titanium-500 tracking-widest uppercase mt-2" style={{ letterSpacing: '2px' }}>
          {tagline}
        </p>
      )}
    </div>
  );
};

export default Logo;
