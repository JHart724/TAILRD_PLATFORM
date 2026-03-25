export const DATA_SOURCE = {
  useRealApi: process.env.REACT_APP_USE_REAL_API === 'true',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  demoMode: process.env.REACT_APP_DEMO_MODE === 'true',
};
