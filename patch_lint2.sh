sed -i 's/} as any);/} as unknown as ReturnType<typeof supabase.from>);/g' tests/unit/connector-scope-drift.spec.ts
