/**
 * i18n entry point for APEX OmniHub.
 *
 * Re-exports the full i18next initialisation from the ./i18n/ module
 * directory. This file exists so tooling that resolves named files
 * (e.g. test gates, static analysers) can locate the module.
 *
 * The full configuration — locale JSON files, language detector,
 * format helpers — lives in ./i18n/index.ts.
 *
 * Imported as a side-effect in main.tsx before the React tree mounts:
 *   import './i18n';
 */
export { default } from './i18n/index';
