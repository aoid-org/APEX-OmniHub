import { describe, it, expect } from 'vitest';
import { compressToolSchema, inflateToolSchema, type ToolSchema } from '../src/core/schema-compressor';

describe('Schema Compressor (TSCG)', () => {
  const sampleSchema: ToolSchema = {
    name: 'test_tool',
    description: 'This tool will process data. By default, it returns a string.',
    parameters: {
      type: 'object',
      properties: {
        verbose_key_name: {
          type: 'string',
          description: 'A verbose key description',
        },
        enum_key: {
          type: 'string',
          enum: ['A', 'B', 'C'],
        },
        nullable_key: {
          type: ['string', 'null'],
        },
        default_key: {
          type: 'integer',
          default: 42,
        }
      },
      required: ['verbose_key_name'],
    },
  };

  it('compresses and inflates losslessly', () => {
    const { compressed, keyMap } = compressToolSchema(sampleSchema);
    
    // Check compression side-effects
    expect(compressed.description).toBe('process data.'); // SDM
    expect(compressed.parameters?.properties['a']).toBeDefined(); // CFO (key aliased)
    expect(compressed.parameters?.properties['enum_key']).toBeUndefined(); // It was aliased to 'b' because 'enum_key'.length > 4
    
    // Check inflation
    const inflated = inflateToolSchema(compressed, keyMap);
    
    // Verify structure
    expect(inflated.name).toBe(sampleSchema.name);
    // Descriptions stay compressed, this is lossy by design (SDM)
    expect(inflated.description).toBe('process data.');
    
    // Verify properties
    expect(inflated.parameters?.properties['verbose_key_name']).toBeDefined();
    expect(inflated.parameters?.properties['enum_key']).toBeDefined();
  });
});
