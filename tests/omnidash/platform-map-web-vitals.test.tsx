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

  it('starmap hero uses deterministic split copy and right-side 3D stage', () => {
    expect(starmapSource).toContain("'.ohsm-section .ohsm-inner{position:relative;z-index:1;max-width:1180px;margin:0 auto;display:grid;");
    expect(starmapSource).toContain('grid-template-columns:minmax(0,.95fr) minmax(360px,1.05fr)');
    expect(starmapSource).toContain("'.ohsm-copy{display:grid;gap:18px;min-width:0;max-width:600px}'");
    expect(starmapSource).toContain("'.ohsm-stage-3d{position:relative;min-height:clamp(360px,48vh,560px);width:100%;overflow:visible;pointer-events:none}'");
    expect(starmapSource).toContain("'.ohsm-stage-3d .ohsm-hero-3d{position:absolute;inset:0;width:100%;height:100%;'");
    expect(starmapSource).toContain("var copy = el('div', 'ohsm-copy');");
    expect(starmapSource).toContain("var stage3d = el('div', 'ohsm-stage-3d');");
    expect(starmapSource).toContain('stage3d.appendChild(hero3d);');
    expect(starmapSource).toContain('inner.appendChild(copy);');
    expect(starmapSource).toContain('inner.appendChild(stage3d);');
    expect(starmapSource).toContain('@media (max-width:899px){.ohsm-section .ohsm-inner{max-width:none;grid-template-columns:1fr}');
    expect(starmapSource).toContain('var heroRoot = new THREE.Group();');
    expect(starmapSource).toContain('cam.position.set(0, 11, 72);');
    expect(starmapSource).toContain('cam.lookAt(0, 0, 0);');
    expect(starmapSource).toContain('var coreBeacon = new THREE.Mesh');
    expect(starmapSource).toContain('var safeProg = Math.max(0.001, Math.min(0.999, prog));');
    expect(starmapSource).not.toContain('host.appendChild(hero3d);');
    expect(starmapSource).not.toContain('max-width:min(600px,50%)');
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
