import { toast } from '../components/shared/Toast';

/**
 * Placeholder handler for buttons that are not yet wired to real functionality.
 * Shows a consistent "coming soon" toast rather than silently doing nothing.
 *
 * Usage:
 *   onClick={demoAction('Submit to EMR')}
 *   onClick={demoAction('Drill-down')}  // generic fallback
 */
export function demoAction(featureName?: string): () => void {
  return () => {
    toast.info(
      featureName ? `${featureName}` : 'Feature In Development',
      'Full functionality available in the production EHR-connected build.'
    );
  };
}
