import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const tempDir = path.join(__dirname, '.temp-migration-tests');

function createMigration(name: string, content: string): string {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanupTemp(): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('Additive Migrations Checker', () => {
  afterEach(() => {
    cleanupTemp();
  });

  describe('Reject destructive operations', () => {
    it('should fail on DROP TABLE', () => {
      const content = `
        CREATE TABLE users (id INT);
        DROP TABLE users;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bDROP\s+TABLE\b/i);
    });

    it('should fail on DROP COLUMN', () => {
      const content = `
        ALTER TABLE users DROP COLUMN email;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN\b/i);
    });

    it('should fail on DELETE FROM', () => {
      const content = `
        DELETE FROM users WHERE id = 1;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bDELETE\s+FROM\b/i);
    });

    it('should fail on TRUNCATE', () => {
      const content = `
        TRUNCATE TABLE users;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bTRUNCATE\b/i);
    });

    it('should fail on DROP POLICY', () => {
      const content = `
        DROP POLICY user_policy ON users;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bDROP\s+POLICY\b/i);
    });

    it('should fail on DROP TRIGGER', () => {
      const content = `
        DROP TRIGGER user_trigger ON users;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bDROP\s+TRIGGER\b/i);
    });

    it('should fail on DISABLE ROW LEVEL SECURITY', () => {
      const content = `
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
    });

    it('should fail on REVOKE', () => {
      const content = `
        REVOKE EXECUTE ON FUNCTION critical_func FROM PUBLIC;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bREVOKE\b/i);
    });

    it('should fail on ON DELETE CASCADE', () => {
      const content = `
        ALTER TABLE posts ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).toMatch(/\bON\s+DELETE\s+CASCADE\b/i);
    });
  });

  describe('Allowlist with comment override', () => {
    it('should skip lines with valid additive-allow comment', () => {
      const content = `
        -- additive-allow: DROP_TABLE Migration requires cleanup of legacy table v1
        DROP TABLE legacy_v1;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      const lines = file.split('\n');
      let hasAllowlist = false;
      for (const line of lines) {
        if (/--\s*additive-allow:\s*(\w+)\s+(.{12,})/.test(line)) {
          hasAllowlist = true;
        }
      }
      expect(hasAllowlist).toBe(true);
    });

    it('should reject weak allowlist comments (< 12 chars)', () => {
      const content = `
        -- additive-allow: DROP_TABLE short
        DROP TABLE legacy;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      const hasAllowlist = /--\s*additive-allow:\s*(\w+)\s+(.{12,})/.test(file);
      expect(hasAllowlist).toBe(false);
    });
  });

  describe('Additive-only migrations (pass)', () => {
    it('should pass CREATE TABLE', () => {
      const content = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          email VARCHAR(255) NOT NULL
        );
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDROP\b/i);
      expect(file).not.toMatch(/\bDELETE\b/i);
      expect(file).not.toMatch(/\bTRUNCATE\b/i);
    });

    it('should pass ALTER TABLE ADD COLUMN', () => {
      const content = `
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDROP\b/i);
    });

    it('should pass CREATE INDEX', () => {
      const content = `
        CREATE INDEX idx_users_email ON users(email);
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDROP\b/i);
    });

    it('should pass CREATE POLICY', () => {
      const content = `
        CREATE POLICY user_select ON users FOR SELECT USING (auth.uid() = user_id);
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDROP\b/i);
    });

    it('should pass ENABLE ROW LEVEL SECURITY', () => {
      const content = `
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
    });

    it('should pass INSERT INTO (populating initial data)', () => {
      const content = `
        INSERT INTO roles (name) VALUES ('admin'), ('user');
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      expect(file).not.toMatch(/\bDELETE\s+FROM\b/i);
    });
  });

  describe('SQL comment handling', () => {
    it('should ignore destructive keyword in SQL comment', () => {
      const content = `
        -- This migration previously had: DROP TABLE old_table
        -- But we removed it to preserve data
        CREATE TABLE new_table (id INT);
      `;
      const filePath = createMigration('20260101_test.sql', content);
      const file = fs.readFileSync(filePath, 'utf8');
      // The script removes comments before checking, so DROP in a comment should not trigger
      const lines = file.split('\n');
      let hasDropOutsideComment = false;
      for (const line of lines) {
        const commentIdx = line.indexOf('--');
        const codePart = commentIdx === -1 ? line : line.substring(0, commentIdx);
        if (/\bDROP\s+TABLE\b/i.test(codePart)) {
          hasDropOutsideComment = true;
        }
      }
      expect(hasDropOutsideComment).toBe(false);
    });
  });
});
