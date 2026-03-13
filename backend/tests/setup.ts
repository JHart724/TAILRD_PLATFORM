// Jest setup file for TAILRD Platform tests
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);

// Mock external dependencies if needed
// jest.mock('some-external-library');