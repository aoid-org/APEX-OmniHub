import { expect, test, describe, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const scriptPath = path.join(process.cwd(), 'scripts/ci/check-additive-migrations.ts');

// Each test run gets its own isolated temp directory — never touches supabase/migrations
const suiteTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-additive-migrations-'));

afterAll(() => {
    fs.rmSync(suiteTemp, { recursive: true, force: true });
});

const runScript = (files: Record<string, string>) => {
    const runDir = fs.mkdtempSync(path.join(suiteTemp, 'run-'));

    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(runDir, name), content, 'utf8');
    }

    const result = spawnSync('bun', [scriptPath], {
        encoding: 'utf8',
        cwd: process.cwd(),
        env: {
            ...process.env,
            // Force git diff fallback (no valid base ref) so the script scans all files in MIGRATIONS_DIR
            GITHUB_BASE_REF: 'invalid_ref_that_causes_git_to_fail_999',
            // Override migrations path to our isolated temp dir
            MIGRATIONS_DIR: runDir,
        },
    });

    fs.rmSync(runDir, { recursive: true, force: true });
    return result;
};

describe('check-additive-migrations', () => {
    test('DROP TABLE rejected', () => {
        const res = runScript({ 'test1.sql': 'DROP TABLE my_table;' });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('DROP_TABLE_VIEW');
    });

    test('DELETE FROM rejected', () => {
        const res = runScript({ 'test2.sql': 'DELETE FROM my_table WHERE id = 1;' });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('DELETE_FROM');
    });

    test('TRUNCATE rejected', () => {
        const res = runScript({ 'test3.sql': 'TRUNCATE TABLE my_table;' });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('TRUNCATE');
    });

    test('ALTER TABLE DROP COLUMN rejected', () => {
        const res = runScript({ 'test4.sql': 'ALTER TABLE my_table DROP COLUMN my_col;' });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('ALTER_TABLE_DROP');
    });

    test('ALTER TYPE DROP VALUE rejected', () => {
        const res = runScript({ 'test5.sql': "ALTER TYPE my_enum DROP VALUE 'old_val';" });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('ALTER_TYPE_DROP');
    });

    test('DISABLE RLS rejected', () => {
        const res = runScript({ 'test6.sql': 'ALTER TABLE my_table DISABLE ROW LEVEL SECURITY;' });
        expect(res.status === 1 || res.status === 255 || res.status === null).toBe(true);
        expect(res.stderr).toContain('DISABLE_RLS');
    });

    test('commented destructive words ignored', () => {
        const res = runScript({ 'test7.sql': '-- DROP TABLE my_table;\nSELECT 1;' });
        expect(res.status === 0 || res.status === null).toBe(true);
        expect(res.stdout).toContain('PASS');
    });

    test('allowlisted rule accepted with reason', () => {
        const res = runScript({
            'test8.sql': '-- additive-allow: DROP_TABLE_VIEW removing old table\nDROP TABLE my_table;',
        });
        expect(res.status === 0 || res.status === null).toBe(true);
        expect(res.stdout).toContain('PASS');
    });

    test('fallback all-file scan mode', () => {
        const res = runScript({ 'test9.sql': 'SELECT 1;' });
        expect(res.status === 0 || res.status === null).toBe(true);
        expect(res.stdout).toContain('PASS');
    });

    test('empty migrations directory passes', () => {
        const res = runScript({});
        expect(res.status === 0 || res.status === null).toBe(true);
        expect(res.stdout).toContain('PASS');
    });
});
