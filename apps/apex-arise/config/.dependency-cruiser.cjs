/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "arise-must-not-import-guarded-supabase-functions",
      severity: "error",
      comment:
        "A.R.I.S.E. Phase 0 is measurement-only and must never be able to import (let alone modify) the guarded Supabase functions. Defense in depth.",
      from: { path: "^apps/apex-arise" },
      to: { path: "^supabase/functions/(omnibridge-control|physiomni-action)" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsConfig: {
      fileName: "tsconfig.app.json",
    },
  },
};
