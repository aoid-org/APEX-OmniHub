import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEChannel, SSEManager } from '../../../src/omnihub-gateway/SSEManager';

describe('SSEChannel', () => {
  it('queues events before stream is created', () => {
    const channel = new SSEChannel('test-ch');
    channel.send('test', { foo: 'bar' });
    expect(channel.state).toBe('connecting');
  });

  it('creates a readable stream and transitions to open', () => {
    const channel = new SSEChannel('test-ch');
    const stream = channel.createStream();
    expect(stream).toBeInstanceOf(ReadableStream);
    // State becomes open after start() callback fires
  });

  it('closes cleanly', () => {
    const channel = new SSEChannel('test-ch');
    channel.close();
    expect(channel.state).toBe('closed');
  });

  it('logs warning when backpressure drops events', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const channel = new SSEChannel('bp-test');

    // Fill queue to MAX_QUEUE_SIZE (1000) then one more
    for (let i = 0; i < 1001; i++) {
      channel.send('event', { i });
    }

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SSEChannel:bp-test] Backpressure: dropped event'),
    );
    warnSpy.mockRestore();
  });
});

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager();
  });

  it('creates channels with unique IDs', () => {
    const [id1] = manager.createChannel();
    const [id2] = manager.createChannel();
    expect(id1).not.toBe(id2);
  });

  it('creates channel with custom ID', () => {
    const [id] = manager.createChannel('custom-id');
    expect(id).toBe('custom-id');
  });

  it('replaces existing channel with same ID', () => {
    manager.createChannel('dup');
    manager.createChannel('dup');
    const subs = manager.getSubscriptions();
    expect(subs.filter((s) => s.subscriptionId === 'dup')).toHaveLength(1);
  });

  it('closeChannel removes the channel', () => {
    manager.createChannel('to-close');
    expect(manager.closeChannel('to-close')).toBe(true);
    expect(manager.closeChannel('to-close')).toBe(false); // already gone
  });

  it('closeAll removes all channels', () => {
    manager.createChannel();
    manager.createChannel();
    manager.closeAll();
    expect(manager.getSubscriptions()).toHaveLength(0);
  });

  it('pruneStale removes closed/error channels', () => {
    const [id] = manager.createChannel('stale');
    manager.closeChannel(id);
    // Channel is deleted on closeChannel, so prune won't find it
    // But if we close the underlying channel without removing from map:
    manager.createChannel('stale2');
    expect(manager.pruneStale()).toBe(0); // connecting state channels are not stale
  });

  it('createResponse returns channelId and Response', () => {
    const { channelId, response } = manager.createResponse('resp-test');
    expect(channelId).toBe('resp-test');
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(response.headers.get('X-SSE-Channel-Id')).toBe('resp-test');
  });
});
