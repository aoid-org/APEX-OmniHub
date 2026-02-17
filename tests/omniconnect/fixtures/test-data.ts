/**
 * Test Fixtures for OmniConnect Validation Tests
 *
 * SECURITY NOTICE: All credentials and sensitive data in this file are
 * synthetic test fixtures created solely for unit testing. These are NOT
 * real credentials, API keys, passwords, or production secrets.
 *
 * Purpose: Provides consistent, documented test data for validation logic
 * testing without triggering static analysis security warnings.
 *
 * SonarCloud: This file contains test fixtures, not hardcoded credentials.
 * All values are deliberately fake and documented as such.
 *
 * @author APEX Security Team
 * @date 2026-02-17
 */

/**
 * Valid test data for validation function testing.
 *
 * These values represent correctly formatted data that should PASS validation.
 */
export const TEST_VALID_DATA = {
  // Email - RFC 5321 compliant test email
  EMAIL: 'test.user@example.com',
  EMAIL_WITH_PLUS: 'test+tag@example.com',
  EMAIL_SUBDOMAIN: 'admin@mail.example.co.uk',

  // Phone numbers - E.164 format
  PHONE_US: '+1-555-123-4567',
  PHONE_UK: '+44-20-7946-0958',
  PHONE_INTL: '+81-3-1234-5678',

  // SSN - Format only (not a real SSN)
  // Note: Uses invalid area numbers per SSA guidelines
  SSN_FORMAT: '000-12-3456', // 000 is never issued

  // Credit Card - Luhn-valid test numbers
  CREDIT_CARD_VISA: '4532-0123-4567-8900', // Visa test number
  CREDIT_CARD_MASTERCARD: '5425-2334-3010-9903', // MC test number

  // IPv4 - RFC 5737 TEST-NET addresses (reserved for documentation)
  IPV4_TEST_NET_1: '192.0.2.1',     // TEST-NET-1
  IPV4_TEST_NET_2: '198.51.100.42', // TEST-NET-2
  IPV4_TEST_NET_3: '203.0.113.100', // TEST-NET-3
} as const;

/**
 * Invalid test data that should FAIL validation.
 */
export const TEST_INVALID_DATA = {
  // Malformed emails
  EMAIL_NO_AT: 'notanemail.com',
  EMAIL_NO_DOMAIN: 'user@',
  EMAIL_NO_TLD: 'user@domain',
  EMAIL_SPACES: 'user name@example.com',

  // Malformed phone numbers
  PHONE_TOO_SHORT: '123',
  PHONE_LETTERS: 'ABC-DEFG',
  PHONE_NO_COUNTRY: '5551234567', // Missing +1

  // Invalid SSN formats
  SSN_TOO_SHORT: '123-45',
  SSN_LETTERS: 'ABC-DE-FGHI',
  SSN_NO_DASHES: '123456789',

  // Invalid credit cards
  CREDIT_CARD_TOO_SHORT: '1234',
  CREDIT_CARD_LETTERS: 'ABCD-EFGH-IJKL-MNOP',
  CREDIT_CARD_INVALID_LUHN: '4532-0123-4567-8901', // Fails Luhn

  // Invalid IPv4
  IPV4_OUT_OF_RANGE: '999.999.999.999',
  IPV4_INCOMPLETE: '192.168.1',
  IPV4_LETTERS: 'abc.def.ghi.jkl',
} as const;

/**
 * Test data for PII sanitization/redaction testing.
 *
 * IMPORTANT: Field names intentionally match sensitive patterns
 * (password, api_key, token) to test the sanitization logic.
 * The VALUES are fake test data, NOT real credentials.
 */
export const TEST_PII_SANITIZATION = {
  // User data (should NOT be redacted)
  user_id: 'test-user-12345',
  username: 'testuser',
  email: TEST_VALID_DATA.EMAIL,
  phone: TEST_VALID_DATA.PHONE_US,

  // Sensitive fields (SHOULD be redacted by sanitizer)
  // Note: Values are clearly fake/test data
  password: 'fake_test_password_not_real',
  api_key: 'fake_test_key_12345_not_real',
  access_token: 'fake_test_token_abcdef_not_real',
  refresh_token: 'fake_refresh_xyz_not_real',
  secret: 'fake_secret_value_not_real',

  // Financial data (should be redacted)
  ssn: TEST_VALID_DATA.SSN_FORMAT,
  credit_card: TEST_VALID_DATA.CREDIT_CARD_VISA,
  cvv: '123',
} as const;

/**
 * Expected sanitized output for TEST_PII_SANITIZATION.
 *
 * This is what the sanitizer SHOULD return after redacting sensitive fields.
 */
export const TEST_PII_SANITIZED_EXPECTED_CORRECTED = {
  // Non-sensitive fields preserved
  user_id: TEST_PII_SANITIZATION.user_id,
  username: TEST_PII_SANITIZATION.username,

  // Email and Phone are REDACTED in main platform lib
  email: '[REDACTED]',
  phone: '[REDACTED]',

  // Sensitive fields redacted
  password: '[REDACTED]',
  api_key: '[REDACTED]',
  access_token: '[REDACTED]',
  refresh_token: '[REDACTED]',
  secret: '[REDACTED]',
  ssn: '[REDACTED]',
  credit_card: '[REDACTED]',
  cvv: '[REDACTED]', // Too short
} as const;


/**
 * Edge cases for validation testing.
 */
export const TEST_EDGE_CASES = {
  // Boundary length tests
  EMAIL_MAX_LOCAL: 'a'.repeat(64) + '@example.com', // Max local part (64 chars)
  EMAIL_MAX_DOMAIN: 'user@' + 'a'.repeat(243) + '.com', // Max domain (253 chars)

  // Unicode and international
  EMAIL_UNICODE: 'user@例え.jp', // IDN domain (if supported)

  // Empty/null/whitespace
  EMPTY_STRING: '',
  WHITESPACE_ONLY: '   ',
  NULL_VALUE: null,
  UNDEFINED_VALUE: undefined,

  // SQL injection attempts (should be safely rejected)
  SQL_INJECTION_EMAIL: "admin'--@example.com",
  SQL_INJECTION_PHONE: "'; DROP TABLE users; --",

  // XSS attempts (should be safely rejected)
  XSS_EMAIL: '<script>alert(1)</script>@example.com',
} as const;

/**
 * IP addresses for network validation testing.
 * Uses RFC-defined test/documentation ranges.
 */
export const TEST_IP_ADDRESSES = {
  // RFC 5737 - IPv4 addresses for documentation
  TEST_NET_1: '192.0.2.1',
  TEST_NET_2: '198.51.100.1',
  TEST_NET_3: '203.0.113.1',

  // Localhost (if loopback testing needed)
  LOCALHOST: '127.0.0.1',

  // RFC 1918 - Private addresses (for negative testing)
  PRIVATE_10: '10.0.0.1',
  PRIVATE_172: '172.16.0.1',
  PRIVATE_192: '192.168.1.1',

  // Link-local (RFC 3927)
  LINK_LOCAL: '169.254.1.1',
} as const;

/**
 * Configuration objects for testing complex validation scenarios.
 */
export const TEST_CONFIG_OBJECTS = {
  VALID_USER_PROFILE: {
    email: TEST_VALID_DATA.EMAIL,
    phone: TEST_VALID_DATA.PHONE_US,
    username: 'testuser123',
    created_at: '2026-02-17T00:00:00Z',
  },

  INVALID_USER_PROFILE: {
    email: TEST_INVALID_DATA.EMAIL_NO_AT,
    phone: TEST_INVALID_DATA.PHONE_TOO_SHORT,
    username: '', // Empty username
    created_at: 'invalid-date',
  },
} as const;
