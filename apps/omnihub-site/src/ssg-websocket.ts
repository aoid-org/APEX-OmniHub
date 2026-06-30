/**
 * Node 20 SSG WebSocket bridge.
 *
 * Supabase Realtime expects a WebSocket constructor during SSG. Node 22 has a
 * native global WebSocket, but local/CI Node 20 does not. The app already ships
 * the `ws` package for this environment, so install it as a server-only global
 * before any route module imports the Supabase client.
 */
import WebSocket from 'ws';

if (globalThis.WebSocket === undefined) {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}
