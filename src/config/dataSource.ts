const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

// Production safety guard: demo mode must NEVER be enabled on production domains.
// REACT_APP_DEMO_MODE is baked at build time and cannot be changed at runtime.
// If this guard fires, the build was misconfigured.
if (isDemoMode && typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isProduction = !['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
    && !hostname.endsWith('.local')
    && !hostname.includes('staging')
    && !hostname.includes('preview')
    && !hostname.includes('netlify.app');
  if (isProduction) {
    console.error(
      '[SECURITY] REACT_APP_DEMO_MODE=true on production domain. ' +
      'This build was misconfigured. Demo mode bypasses all authentication. ' +
      'Rebuild immediately with REACT_APP_DEMO_MODE=false.'
    );
  }
}

export const DATA_SOURCE = {
  useRealApi: process.env.REACT_APP_USE_REAL_API === 'true',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  demoMode: isDemoMode,
};
