import { useEffect, useCallback, useMemo } from 'react';

// Performance optimization hook for smooth demo experience
export const usePerformanceOptimization = () => {
  // Optimize animations for smooth performance
  useEffect(() => {
    // Force GPU acceleration for smoother animations
    const enableGPUAcceleration = () => {
      const style = document.createElement('style');
      style.textContent = `
        .card-web3-hover,
        .floating-screen,
        .retina-card,
        .animate-pulse,
        .animate-float,
        .animate-shimmer {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
          will-change: transform, opacity;
        }
        
        /* Optimize backdrop-blur for better performance */
        .backdrop-blur-md,
        .backdrop-blur-xl,
        .backdrop-blur-retina {
          -webkit-backdrop-filter: blur(var(--blur-radius));
          backdrop-filter: blur(var(--blur-radius));
          transform: translateZ(0);
        }
        
        /* Smooth scroll for demo navigation */
        html {
          scroll-behavior: smooth;
        }
        
        /* Optimize gradient animations */
        .bg-gradient-to-br,
        .bg-gradient-to-r {
          background-attachment: fixed;
        }
      `;
      document.head.appendChild(style);
    };

    enableGPUAcceleration();

    // Cleanup function
    return () => {
      const styles = document.querySelectorAll('style');
      styles.forEach(style => {
        if (style.textContent?.includes('card-web3-hover')) {
          style.remove();
        }
      });
    };
  }, []);

  // Debounced resize handler for responsive performance
  const handleResize = useCallback(() => {
    // Optimize layout calculations on resize
    requestAnimationFrame(() => {
      // Trigger layout recalculation if needed
      const cards = document.querySelectorAll('.retina-card, .card-web3-hover');
      cards.forEach(card => {
        (card as HTMLElement).style.transform = 'translateZ(0)';
      });
    });
  }, []);

  // Memoized performance settings
  const performanceSettings = useMemo(() => ({
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isHighPerformanceDevice: navigator.hardwareConcurrency > 4,
    supportsBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
  }), []);

  return {
    handleResize,
    performanceSettings,
  };
};

// Intersection Observer hook for lazy loading and animations
export const useIntersectionObserver = (
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          entry.target.classList.remove('opacity-0');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, [targetRef, options]);
};

// Virtual scrolling helper for large datasets
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    const totalHeight = itemCount * itemHeight;
    
    return {
      visibleCount,
      totalHeight,
      getVisibleRange: (scrollTop: number) => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(start + visibleCount, itemCount);
        return { start, end };
      },
    };
  }, [itemCount, itemHeight, containerHeight]);
};