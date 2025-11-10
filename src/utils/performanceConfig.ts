// Performance Configuration for TAILRD Platform Demo
export const PERFORMANCE_CONFIG = {
  // Animation settings for smooth demo experience
  animations: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      medical: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // GPU acceleration settings
  gpu: {
    enable3D: true,
    enableWillChange: true,
    enableBackfaceVisibility: true,
  },

  // Viewport settings for optimal rendering
  viewport: {
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1200px',
      large: '1800px',
    },
    renderOptimization: {
      lazyLoadThreshold: '50px',
      intersectionThreshold: 0.1,
    },
  },

  // Demo-specific optimizations
  demo: {
    preloadCriticalAssets: true,
    enableSmoothScrolling: true,
    optimizeBackdropFilters: true,
    enableHardwareAcceleration: true,
  },

  // Memory management
  memory: {
    maxCachedComponents: 10,
    debounceDelay: 300,
    throttleDelay: 100,
  },
};

// CSS custom properties for consistent performance
export const PERFORMANCE_CSS_VARS = `
  :root {
    --animation-duration-fast: ${PERFORMANCE_CONFIG.animations.duration.fast};
    --animation-duration-normal: ${PERFORMANCE_CONFIG.animations.duration.normal};
    --animation-duration-slow: ${PERFORMANCE_CONFIG.animations.duration.slow};
    --animation-easing-smooth: ${PERFORMANCE_CONFIG.animations.easing.smooth};
    --animation-easing-medical: ${PERFORMANCE_CONFIG.animations.easing.medical};
    --animation-easing-bounce: ${PERFORMANCE_CONFIG.animations.easing.bounce};
  }
`;

// Performance monitoring utilities
export const performanceMonitor = {
  // Track component render times
  trackRender: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(`${componentName} render`);
      return () => console.timeEnd(`${componentName} render`);
    }
    return () => {};
  },

  // Monitor memory usage
  checkMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576),
        total: Math.round(memory.totalJSHeapSize / 1048576),
        limit: Math.round(memory.jsHeapSizeLimit / 1048576),
      };
    }
    return null;
  },

  // Log performance metrics
  logMetrics: () => {
    if (process.env.NODE_ENV === 'development') {
      const memory = performanceMonitor.checkMemoryUsage();
      if (memory) {
        console.log('Memory Usage:', memory);
      }
    }
  },
};

// Optimize images for better loading performance
export const imageOptimization = {
  // WebP support detection
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },

  // Lazy loading configuration
  lazyLoadConfig: {
    rootMargin: PERFORMANCE_CONFIG.viewport.renderOptimization.lazyLoadThreshold,
    threshold: PERFORMANCE_CONFIG.viewport.renderOptimization.intersectionThreshold,
  },
};

// Web 3.0 specific performance optimizations
export const web3Optimizations = {
  // Backdrop filter fallback for better performance
  backdropFilterFallback: (element: HTMLElement) => {
    if (!CSS.supports('backdrop-filter', 'blur(10px)')) {
      element.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    }
  },

  // GPU layer promotion for smooth animations
  promoteToGPULayer: (selector: string) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      (element as HTMLElement).style.transform = 'translateZ(0)';
      (element as HTMLElement).style.willChange = 'transform, opacity';
    });
  },

  // Optimize glassmorphism effects
  optimizeGlassmorphism: () => {
    const style = document.createElement('style');
    style.textContent = `
      .backdrop-blur-xl, .backdrop-blur-md, .backdrop-blur-retina {
        isolation: isolate;
        transform: translateZ(0);
      }
      
      .card-web3-hover {
        contain: layout style paint;
        transform: translateZ(0);
      }
    `;
    document.head.appendChild(style);
  },
};