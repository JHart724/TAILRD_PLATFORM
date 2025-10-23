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
      {/* TAILRD text with blue-teal gradient matching your image */}
      <span style={{ 
        fontSize: fontSize.text,
        fontWeight: fontSize.weight,
        letterSpacing: '0.05em',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 30%, #0891b2 70%, #06b6d4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        TAILRD
      </span>
      
      {/* Vertical separator */}
      <div style={{ 
        width: '2px', 
        height: '60%',
        background: 'linear-gradient(to bottom, transparent, #64748b, transparent)'
      }}></div>
      
      {/* HEART text with red gradient matching your image */}
      <span style={{ 
        fontSize: fontSize.text,
        fontWeight: fontSize.weight,
        letterSpacing: '0.05em',
        background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 40%, #ef4444 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        HEART
      </span>
    </div>
  );
};

export default TailrdLogo;