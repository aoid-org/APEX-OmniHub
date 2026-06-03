/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Theme System', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem('omni_theme_preference');
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem('omni_theme_preference');
  });

  it.todo('updates document.documentElement.dataset.theme when theme changes');

  it.todo('persists theme preference after reload');

  it.todo('major shell surfaces use theme-aware classes/tokens');
});
