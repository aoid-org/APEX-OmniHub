import { SkillDefinition, SkillMatch } from './types.ts';

/**
 * @deprecated Use DynamicToolScanner instead. This centralized registry is
 * retained for backward compatibility but will be removed in a future release.
 * Migration: Annotate tool functions with the @tool decorator and let
 * DynamicToolScanner auto-discover them at runtime.
 */
export class SkillRegistry {
  private readonly supabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private aiSession: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.aiSession) {
      await this.initializeAISession();
    }
  }

  private async initializeAISession() {
    try {
      // Initialize Supabase AI session for gte-small embeddings
      this.aiSession = await this.supabase.ai.createSession({
        model: 'gte-small'
      });
    } catch (error) {
      console.error('Failed to initialize AI session:', error);
      throw new Error('Supabase AI session unavailable. Ensure AI add-on is enabled and compute credits are available.');
    }
  }

  /**
   * Register a new skill in the registry
   */
  async registerSkill(skill: SkillDefinition): Promise<void> {
    await this.ensureInitialized();
    // Sanitize inputs
    const sanitizedName = skill.name.trim();
    const sanitizedDescription = skill.description.trim();

    if (!sanitizedName || !sanitizedDescription) {
      throw new Error('Skill name and description are required');
    }

    // Generate embedding for the skill description
    let embedding: number[];
    try {
      const response = await this.aiSession.run({
        input: `${sanitizedName}: ${sanitizedDescription}`,
        mean_pool: true,
        normalize: true
      });
      embedding = response.embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error('Embedding generation failed. Check AI session and credits.');
    }

    // Convert to pgvector format
    const embeddingVector = `[${embedding.join(',')}]`;

    // Upsert skill into database
    const { error } = await this.supabase
      .from('agent_skills')
      .upsert({
        name: sanitizedName,
        description: sanitizedDescription,
        tool_definition: skill.parameters,
        embedding: embeddingVector,
        metadata: skill.metadata || {}
      }, {
        onConflict: 'name'
      });

    if (error) {
      console.error('Failed to register skill:', error);
      throw new Error(`Skill registration failed: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant skills based on a query
   */
  async retrieveSkills(query: string, limit: number = 5, threshold: number = 0.1): Promise<SkillDefinition[]> {
    await this.ensureInitialized();
    const sanitizedQuery = query.trim();

    if (!sanitizedQuery) {
      return [];
    }

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      const response = await this.aiSession.run({
        input: sanitizedQuery,
        mean_pool: true,
        normalize: true
      });
      queryEmbedding = response.embedding;
    } catch (error) {
      console.error('Failed to generate query embedding:', error);
      throw new Error('Query embedding generation failed. Check AI session and credits.');
    }

    // Convert to pgvector format
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    // Call the hybrid search RPC
    const { data: matches, error } = await this.supabase
      .rpc('match_skills', {
        query_embedding: embeddingVector,
        query_text: sanitizedQuery,
        match_threshold: threshold,
        match_count: limit
      });

    if (error) {
      console.error('Failed to retrieve skills:', error);
      throw new Error(`Skill retrieval failed: ${error.message}`);
    }

    // Convert database results to SkillDefinition format
    return (matches || []).map((match: SkillMatch) => ({
      name: match.name,
      description: match.description,
      parameters: match.tool_definition,
      metadata: match.metadata
    }));
  }

  /**
   * Get all registered skills (for debugging/admin purposes)
   */
  async getAllSkills(): Promise<SkillDefinition[]> {
    const { data, error } = await this.supabase
      .from('agent_skills')
      .select('name, description, tool_definition, metadata')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get all skills:', error);
      throw new Error(`Failed to retrieve skills: ${error.message}`);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      name: row.name,
      description: row.description,
      parameters: row.tool_definition,
      metadata: row.metadata
    }));
  }

  /**
   * Remove a skill from the registry
   */
  async removeSkill(skillName: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_skills')
      .delete()
      .eq('name', skillName.trim());

    if (error) {
      console.error('Failed to remove skill:', error);
      throw new Error(`Skill removal failed: ${error.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Dynamic Tool Scanner — decorator-based discovery (replaces SkillRegistry)
// ---------------------------------------------------------------------------

/** Metadata stored by the @tool decorator on each annotated function. */
interface ToolMetadata {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters?: Record<string, any>;
}

/**
 * Global tool registry populated by the @tool decorator.
 * Each decorated function is pushed here at module-evaluation time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _toolRegistry: Array<{ meta: ToolMetadata; handler: (...args: any[]) => any }> = [];

/**
 * Decorator factory — annotate any exported async function with
 * `@tool({ name, description, parameters })` to register it for
 * automatic MCP discovery.
 *
 * @example
 *   export const myTool = tool({
 *     name: 'my_tool',
 *     description: 'Does a thing',
 *     parameters: { query: { type: 'string' } }
 *   })(async (args) => { ... });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tool(meta: ToolMetadata): (fn: (...args: any[]) => any) => (...args: any[]) => any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (fn: (...args: any[]) => any) => {
    _toolRegistry.push({ meta, handler: fn });
    return fn;
  };
}

/**
 * Scans the Supabase edge-function module tree for files exporting
 * `@tool`-decorated functions and auto-registers them with the
 * provided MCPService instance.
 *
 * Usage:
 *   const scanner = new DynamicToolScanner();
 *   await scanner.scan('supabase/functions');
 *   scanner.attachTo(mcpService);
 */
export class DynamicToolScanner {
  private readonly discoveredModules: string[] = [];

  /**
   * Recursively walk `basePath` looking for `.ts` files,
   * dynamically import each one so its `@tool` decorators fire,
   * then record the module path for audit purposes.
   */
  async scan(basePath: string): Promise<void> {
    await this.walkDir(basePath);
  }

  /** Return a snapshot of all registered tools (read-only). */
  get tools(): ReadonlyArray<{ meta: ToolMetadata }> {
    return _toolRegistry.map(t => ({ meta: t.meta }));
  }

  /** Return list of module paths that were scanned. */
  get modules(): ReadonlyArray<string> {
    return this.discoveredModules;
  }

  /**
   * Attach all discovered tools to an MCPService-compatible object.
   * The service must expose an `addTool(name, description, parameters, handler)` method.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachTo(mcpService: { addTool: (name: string, description: string, parameters: Record<string, any>, handler: (...args: any[]) => any) => void }): void {
    for (const { meta, handler } of _toolRegistry) {
      mcpService.addTool(meta.name, meta.description, meta.parameters ?? {}, handler);
    }
  }

  // ── private ──────────────────────────────────────────────────

  private async walkDir(dir: string): Promise<void> {
    // Deno-native recursive directory reading
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Deno = (globalThis as any).Deno;
    if (!Deno?.readDir) {
      console.warn('DynamicToolScanner requires Deno runtime. Skipping scan.');
      return;
    }

    for await (const entry of Deno.readDir(dir)) {
      const fullPath = `${dir}/${entry.name}`;

      if (entry.isDirectory && !entry.name.startsWith('_') && entry.name !== 'node_modules') {
        await this.walkDir(fullPath);
      } else if (entry.isFile && entry.name.endsWith('.ts') && !entry.name.startsWith('_')) {
        try {
          await import(fullPath);
          this.discoveredModules.push(fullPath);
        } catch (err) {
          console.warn(`DynamicToolScanner: failed to import ${fullPath}:`, err);
        }
      }
    }
  }
}
