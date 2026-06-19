import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OmniHubPlatformMap from '../../apps/omnihub-site/src/components/OmniHubPlatformMap';

const landingCss = readFileSync('apps/omnihub-site/src/styles/landing.css', 'utf8');
const componentsCss = readFileSync('apps/omnihub-site/src/styles/components.css', 'utf8');
const starmapSource = readFileSync('apps/omnihub-site/public/omnihub-starmap.js', 'utf8');
const maestroHtml = readFileSync('apps/omnihub-site/maestro.html', 'utf8');
const maestroPageSource = readFileSync('apps/omnihub-site/src/pages/Maestro.tsx', 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
  document.head.innerHTML = '';
});

describe('Web Vitals regressions', () => {
  it('OmniHubPlatformMap reserves stable layout before starmap script mount', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<OmniHubPlatformMap />);

    const host = screen.getByLabelText('Platform capability map');
    expect(host).toHaveClass('omnihub-platform-map-host');
    expect(host).toHaveAttribute('id', 'platform-map');
    expect(landingCss).toContain('.landing-root .omnihub-platform-map-host');
    expect(landingCss).toContain('min-height: clamp(520px, 72vh, 820px)');
    expect(landingCss).toContain('contain: layout paint');
    expect(landingCss).toContain('content-visibility: auto');
    expect(landingCss).toContain('contain-intrinsic-size: 720px');

    const script = document.getElementById('ohsm-script');
    expect(script).toBeInstanceOf(HTMLScriptElement);
    script?.dispatchEvent(new Event('error'));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(host).toHaveClass('omnihub-platform-map-host');
  });

  it('starmap primary CTA defers heavy overlay work outside the input event', () => {
    expect(starmapSource).toContain('function scheduleStarmapWork(work)');
    expect(starmapSource).toContain('requestAnimationFrame(function () { work(); });');
    expect(starmapSource).toContain("launch.setAttribute('aria-busy', 'true')");
    expect(starmapSource).toContain('scheduleStarmapWork(function () {');
    expect(starmapSource).toContain('new Overlay(opts);');
    expect(starmapSource).not.toContain("launch.addEventListener('click', function () { new Overlay(opts); });");
  });

  it('Maestro route has stable initial layout shell', () => {
    expect(maestroPageSource).toContain('data-page="maestro"');
    expect(maestroPageSource).toContain('className="maestro-page"');
    expect(componentsCss).toContain('#root.maestro-root-shell');
    expect(componentsCss).toContain('.maestro-page');
    expect(componentsCss).toContain('min-height: 100vh');
    expect(componentsCss).toContain('contain: layout paint');
    expect(maestroHtml).toContain('class="maestro-root-shell"');
    expect(maestroHtml).toContain('html, body, #root.maestro-root-shell { min-height: 100vh; }');
  });
});
