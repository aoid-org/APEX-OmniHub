/**
 * Supabase Database Tools (8 tools)
 * All writes are admin-scoped via SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { MCPTool, ToolCallResult } from "./registry.ts";
import { ok, err } from "./registry.ts";

type DbClient = ReturnType<typeof createClient>;

function adminClient(): DbClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

export const dbTools: MCPTool[] = [
  {
    name: "db_list_tables",
    description: "List all user-defined tables in the public schema.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "db_get_schema",
    description: "Get column definitions for a specific table.",
    inputSchema: {
      type: "object",
      properties: { table: { type: "string", description: "Table name" } },
      required: ["table"],
    },
  },
  {
    name: "db_select",
    description: "Query rows from a table with optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        columns: { type: "string", description: "Comma-separated columns, default *" },
        filter: { type: "object", description: "Key-value equality filters" },
        limit: { type: "number", description: "Max rows (default 50, max 500)" },
      },
      required: ["table"],
    },
  },
  {
    name: "db_insert",
    description: "Insert one or more records into a table.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        records: { type: "array", description: "Array of record objects" },
      },
      required: ["table", "records"],
    },
  },
  {
    name: "db_update",
    description: "Update records matching a filter.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        filter: { type: "object", description: "Key-value equality filters" },
        updates: { type: "object", description: "Fields to update" },
      },
      required: ["table", "filter", "updates"],
    },
  },
  {
    name: "db_delete",
    description: "Delete records matching a filter.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        filter: { type: "object", description: "Key-value equality filters" },
      },
      required: ["table", "filter"],
    },
  },
  {
    name: "db_upsert",
    description: "Upsert records into a table (insert or update on conflict).",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        records: { type: "array" },
        onConflict: { type: "string", description: "Conflict column(s), e.g. 'id'" },
      },
      required: ["table", "records"],
    },
  },
  {
    name: "db_execute_sql",
    description: "Execute a raw read-only SQL statement (SELECT only).",
    inputSchema: {
      type: "object",
      properties: { sql: { type: "string", description: "SELECT statement" } },
      required: ["sql"],
    },
  },
];

async function dbListTables(sb: DbClient): Promise<ToolCallResult> {
  const { data, error } = await sb.rpc("list_tables");
  if (error) {
    const { data: d2, error: e2 } = await sb
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_type", "BASE TABLE");
    if (e2) return err(e2.message);
    return ok(d2);
  }
  return ok(data);
}

async function dbGetSchema(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const { data, error } = await sb
    .from("information_schema.columns")
    .select("column_name,data_type,is_nullable,column_default")
    .eq("table_schema", "public")
    .eq("table_name", args.table);
  if (error) return err(error.message);
  return ok(data);
}

async function dbSelect(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const columns = (args.columns as string | undefined) ?? "*";
  const filter = (args.filter as Record<string, unknown> | undefined) ?? {};
  const limit = Math.min(Number(args.limit ?? 50), 500);
  let q = sb.from(String(args.table)).select(columns).limit(limit);
  for (const [k, v] of Object.entries(filter)) {
    q = q.eq(k, v);
  }
  const { data, error } = await q;
  if (error) return err(error.message);
  return ok(data);
}

async function dbInsert(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const { data, error } = await sb
    .from(String(args.table))
    .insert(args.records)
    .select();
  if (error) return err(error.message);
  return ok(data);
}

async function dbUpdate(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const filter = (args.filter as Record<string, unknown>) ?? {};
  let q = sb.from(String(args.table)).update(args.updates);
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { data, error } = await q.select();
  if (error) return err(error.message);
  return ok(data);
}

async function dbDelete(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const filter = (args.filter as Record<string, unknown>) ?? {};
  let q = sb.from(String(args.table)).delete();
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { data, error } = await q.select();
  if (error) return err(error.message);
  return ok({ deleted: data });
}

async function dbUpsert(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const { data, error } = await sb
    .from(String(args.table))
    .upsert(args.records, { onConflict: (args.onConflict as string | undefined) ?? "id" })
    .select();
  if (error) return err(error.message);
  return ok(data);
}

async function dbExecuteSql(sb: DbClient, args: Record<string, unknown>): Promise<ToolCallResult> {
  const sql = String(args.sql).trim();
  if (!/^select\s/i.test(sql)) {
    return err("Only SELECT statements are allowed in db_execute_sql.");
  }
  const { data, error } = await sb.rpc("execute_sql", { sql });
  if (error) return err(error.message);
  return ok(data);
}

export async function handleDbTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const sb = adminClient();
  try {
    switch (name) {
      case "db_list_tables":  return dbListTables(sb);
      case "db_get_schema":   return dbGetSchema(sb, args);
      case "db_select":       return dbSelect(sb, args);
      case "db_insert":       return dbInsert(sb, args);
      case "db_update":       return dbUpdate(sb, args);
      case "db_delete":       return dbDelete(sb, args);
      case "db_upsert":       return dbUpsert(sb, args);
      case "db_execute_sql":  return dbExecuteSql(sb, args);
      default:                return err(`Unhandled db tool: ${name}`);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
