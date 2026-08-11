// Jest setup file for TAILRD Platform tests
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// AUDIT-214 PR 1 (make-every-env-explicit): default the Layer-3 BAA guard to 'audit'
// for the test suite (CI + local `npm test`) when unset. This is the same permissive
// mode an unset BAA_GUARD_MODE resolves to today, so it changes NO behavior - it only
// declares the mode instead of relying on the default. `??=` never overrides an explicit
// value, so a per-test override or the ci.yml job env still wins. From PR 2 onward, an
// unset BAA_GUARD_MODE becomes a hard startup error (fail-fast); this line keeps the
// singleton wire-up green under that change.
process.env.BAA_GUARD_MODE ??= 'audit';

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