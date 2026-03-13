import React from 'react';

interface TailrdLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark';
  className?: string;
}

const TailrdLogo: React.FC<TailrdLogoProps> = ({
  size = 'medium',
  variant = 'light',
  className = ''
}) => {
  const getFontSize = () => {
 switch (size) {
 case 'small':
 return { text: '20px', weight: 700, gap: '8px' };
 case 'large':
 return { text: '48px', weight: 700, gap: '16px' };
 default:
 return { text: '36px', weight: 700, gap: '12px' };
 }
  };

  const fontSize = getFontSize();

  return (
 <div className={`inline-flex items-center ${className}`} style={{ gap: fontSize.gap }}>
 {/* TAILRD text — Chrome gradient */}
 <span style={{
 fontSize: fontSize.text,
 fontWeight: fontSize.weight,
 letterSpacing: '0.05em',
 background: 'linear-gradient(135deg, #0D2640 0%, #3D6F94 30%, #5A8AB0 70%, #A8C5DD 100%)',
 WebkitBackgroundClip: 'text',
 WebkitTextFillColor: 'transparent',
 backgroundClip: 'text',
 fontFamily: "'Playfair Display', Georgia, serif",
 }}>
 TAILRD
 </span>

 {/* Vertical separator */}
 <div style={{
 width: '2px',
 height: '60%',
 background: 'linear-gradient(to bottom, transparent, #B8C0CE, transparent)'
 }}></div>

 {/* HEART text — Arterial Red gradient */}
 <span style={{
 fontSize: fontSize.text,
 fontWeight: fontSize.weight,
 letterSpacing: '0.05em',
 background: 'linear-gradient(135deg, #4A0B11 0%, #B01C2E 40%, #D94452 100%)',
 WebkitBackgroundClip: 'text',
 WebkitTextFillColor: 'transparent',
 backgroundClip: 'text',
 fontFamily: "'Playfair Display', Georgia, serif",
 }}>
 HEART
 </span>
 </div>
  );
};

export default TailrdLogo;
