/**
 * AUDIT-221 execution-vehicle self-attestation, in one place.
 *
 * The container bakes APP_GIT_SHA at image build (Dockerfile ARG GIT_SHA -> ENV), verified against the pushed
 * registry digest by the deploy gate. Any code that records WHICH build did something reads it from here.
 * 'dev' means the vehicle is unverified - a value that must never appear on a production write record.
 */
export function resolveBuildSha(env: NodeJS.ProcessEnv = process.env): string {
  return env.APP_GIT_SHA || 'dev';
}
