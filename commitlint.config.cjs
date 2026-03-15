// commitlint.config.cjs
// Conventional Commits enforcement for APEX OmniHub.
// Only runs on PR commits — historical / GitHub-UI commits are excluded via ignores.

module.exports = {
  extends: ['@commitlint/config-conventional'],

  // Skip commits that cannot conform to conventional format:
  // 1. GitHub UI auto-generated messages (Delete, Add files, Update, Create, Rename)
  // 2. Emoji-prefixed commits (unicode emoji or :shortcode:)
  // 3. Merge commits
  ignores: [
    (commit) =>
      /^(Add files via upload|Delete |Create |Update |Rename )/i.test(commit),
    (commit) => /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]/u.test(commit),
    (commit) => /^:[a-z_]+:/i.test(commit),
    (commit) => commit.startsWith('Merge '),
  ],

  rules: {
    // Downgrade to warn so long-running sprints with verbose commit bodies don't block CI.
    // Errors still block; warnings surface in the job log.
    'header-max-length': [1, 'warn', 150],
    'subject-max-length': [1, 'warn', 150],
    'footer-max-line-length': [1, 'warn', 300],
    'body-max-line-length': [1, 'warn', 300],

    // Allow sentence-case subjects (common in squash-merged PRs).
    'subject-case': [
      1,
      'never',
      ['start-case', 'pascal-case', 'upper-case'],
    ],
  },
};
