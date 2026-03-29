/**
 * Vitest setup for @apex-omnihub/infrastructure package.
 *
 * Initialises test doubles for AWS SDK and Temporal clients
 * so unit tests run without real cloud credentials.
 */

// Ensure NODE_ENV is set for deterministic test behaviour
process.env.NODE_ENV ??= 'test';
