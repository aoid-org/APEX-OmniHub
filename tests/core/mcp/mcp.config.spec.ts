import { describe, it, expect } from 'vitest';
import { 
  MCPConfigSchema, 
  MCPServerEntrySchema,
  getDefaultConfig 
} from '@/core/mcp/mcp.config';

// Mock getEnvVar implicitly since it uses import.meta.env
vi.mock('@/core/mcp/mcp.config', async (importOriginal) => {
  const actual = await importOriginal<unknown>();
  return {
    ...actual,
    // We just test the schemas mostly
  };
});

describe('mcp.config', () => {

  describe('getDefaultConfig', () => {
    it('should return valid config matching MCPConfigSchema', () => {
      const config = getDefaultConfig();
      const parsed = MCPConfigSchema.parse(config);
      
      expect(parsed.servers).toBeDefined();
      expect(parsed.validators).toBeUndefined(); // Checking defaults
      expect(parsed.defaults.timeoutMs).toBe(30000);
      expect(parsed.servers['firecrawl']).toBeDefined();
      expect(parsed.servers['google-workspace']).toBeDefined();
    });
  });

  describe('MCPConfigSchema', () => {
    it('should apply global defaults', () => {
      const input = {
        servers: {
          test: { 
            name: 'test',
            command: "node",
            args: [],
            env: {},
            transport: 'stdio',
            capabilities: ['tools']
          }
        }
      };
      const parsed = MCPConfigSchema.parse(input);
      expect(parsed.defaults.maxConcurrent).toBe(5);
      expect(parsed.defaults.timeoutMs).toBe(30000);
    });
    
    it('should fail on invalid transport', () => {
      const input = {
        servers: {
          test: { 
            name: 'test',
            command: 'node',
            args: [],
            env: {},
            transport: 'invalid_transport',
            capabilities: ['tools']
          }
        }
      };
      
      expect(() => MCPConfigSchema.parse(input)).toThrow();
    });
  });

  describe('MCPServerEntrySchema', () => {
    it('should apply defaults to server entries', () => {
      const input = {
        name: 'test',
        command: "node",
        args: [],
        env: {},
        transport: 'sse',
        capabilities: ['resources']
      };
      const parsed = MCPServerEntrySchema.parse(input);
      expect(parsed.enabled).toBe(true);
      expect(parsed.timeoutMs).toBe(30000);
      expect(parsed.maxConcurrent).toBe(5);
    });

    it('should reject empty capabilities', () => {
      const input = {
        name: 'test',
        command: "node",
        args: [],
        env: {},
        transport: 'sse',
        capabilities: [] // min 1
      };
      expect(() => MCPServerEntrySchema.parse(input)).toThrow();
    });
  });

});
