/**
 * Auth Session Storage
 * Temporary storage for OAuth2/PKCE state and code verifiers.
 *
 * TODO: Replace in-memory storage with Redis or a persistent database for production.
 */

export class AuthSessionStorage {
  // Using a Map for in-memory storage.
  // In production, this should be replaced with Redis or a database table.
  private storage = new Map<string, string>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  // 15 minutes TTL for auth sessions
  private readonly TTL_MS = 15 * 60 * 1000;

  /**
   * Store the code verifier associated with a specific state.
   * @param state The state parameter used in the OAuth flow.
   * @param codeVerifier The PKCE code verifier to store.
   */
  async storeSession(state: string, codeVerifier: string): Promise<void> {
    // Clear any existing session for this state to reset timer
    await this.clearSession(state);

    this.storage.set(state, codeVerifier);

    // Set TTL to prevent memory leaks
    const timeout = setTimeout(() => {
      this.storage.delete(state);
      this.timeouts.delete(state);
    }, this.TTL_MS);

    // Verify if unref is available (Node.js specific) to prevent keeping process alive
    if (timeout.unref) {
      timeout.unref();
    }

    this.timeouts.set(state, timeout);
  }

  /**
   * Retrieve the code verifier for a given state.
   * @param state The state parameter used to look up the verifier.
   * @returns The code verifier if found, otherwise null.
   */
  async retrieveSession(state: string): Promise<string | null> {
    return this.storage.get(state) || null;
  }

  /**
   * Remove the session for a given state.
   * @param state The state parameter to clear.
   */
  async clearSession(state: string): Promise<void> {
    this.storage.delete(state);

    const timeout = this.timeouts.get(state);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(state);
    }
  }
}

// Export a singleton instance for use across the application
export const authSessionStorage = new AuthSessionStorage();
