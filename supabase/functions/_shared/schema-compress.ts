/**
 * TSCG — Tool Schema Compression and Generation (Flattened)
 * Deno-compatible. Zero external dependencies.
 */

export interface ToolSchema {
  name: string
  description?: string
  parameters?: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

const SDM_PATTERNS: [RegExp, string][] = [
  [/\bThis (parameter|field|property|argument) (specifies|defines|indicates|represents)\b/gi, ''],
  [/\bPlease (provide|specify|include|enter|input)\b/gi, ''],
  [/\bThe (following|provided|given|specified)\b/gi, 'The'],
  [/\bDefaults? to\b/gi, 'def:'],
  [/[.]\s*$/g, ''],
  [/\s{2,}/g, ' '],
]

const TAS_PATTERNS: [RegExp, string][] = [
  [/integer/g, 'int'], [/boolean/g, 'bool'], [/string/g, 'str'],
  [/object/g, 'obj'], [/array/g, 'arr'], [/number/g, 'num'],
]

function applySDM(desc: string): string {
  let out = desc
  for (const [pat, rep] of SDM_PATTERNS) out = out.replace(pat, rep)
  const firstSentence = out.split(/[.!?]\s+/)[0]
  return (firstSentence.length < out.length ? firstSentence : out).trim()
}

function applyTAS(text: string): string {
  let out = text
  for (const [pat, rep] of TAS_PATTERNS) out = out.replace(pat, rep)
  return out
}

function flattenProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const vObj = v as Record<string, unknown>
      if (vObj.allOf && Array.isArray(vObj.allOf) && vObj.allOf.length === 1) {
        out[k] = vObj.allOf[0]
      } else {
        out[k] = v
      }
    } else {
      out[k] = v
    }
  }
  return out
}

export function compressSchema(schema: ToolSchema): { compressed: ToolSchema, reductionPct: number } {
  const originalStr = JSON.stringify(schema)
  let result = JSON.parse(originalStr) as ToolSchema

  if (result.description) result.description = applySDM(result.description)
  result = JSON.parse(applyTAS(JSON.stringify(result))) as ToolSchema

  if (result.parameters?.properties) {
    result.parameters.properties = flattenProperties(result.parameters.properties as Record<string, unknown>)
  }

  const compressedStr = JSON.stringify(result)
  const reductionPct = Math.round(((originalStr.length - compressedStr.length) / originalStr.length) * 100)

  return { compressed: result, reductionPct }
}

export const CODE_MODE_META_TOOLS: ToolSchema[] = [
  {
    name: 'listToolFiles',
    description: 'List available tools',
    parameters: { type: 'obj', properties: { filter: { type: 'str' } } },
  },
  {
    name: 'readToolFile',
    description: 'Read tool signature',
    parameters: { type: 'obj', properties: { name: { type: 'str' } }, required: ['name'] },
  },
  {
    name: 'executeToolCode',
    description: 'Execute tool in sandbox',
    parameters: { type: 'obj', properties: { code: { type: 'str' } }, required: ['code'] },
  },
]
