import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from '../../src/swInit'

describe('registerServiceWorker branch coverage', () => {
  const originalWindow = globalThis.window
  const originalNavigator = globalThis.navigator
  let addEventListenerSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    addEventListenerSpy = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true })
  })

  it('returns without registering when window is absent', () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn() } })
    vi.stubGlobal('addEventListener', addEventListenerSpy)

    registerServiceWorker()

    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('returns without registering when service workers are unsupported', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('addEventListener', addEventListenerSpy)

    registerServiceWorker()

    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('registers /sw.js with root scope on load in supported environments', async () => {
    const register = vi.fn().mockResolvedValue({})
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    vi.stubGlobal('addEventListener', addEventListenerSpy)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerServiceWorker()

    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function))
    const listener = addEventListenerSpy.mock.calls[0]?.[1]
    expect(typeof listener).toBe('function')
    ;(listener as () => void)()
    await Promise.resolve()

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('catches rejected registration without warning outside DEV mode', async () => {
    const register = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubEnv('DEV', false)
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    vi.stubGlobal('addEventListener', addEventListenerSpy)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerServiceWorker()
    const listener = addEventListenerSpy.mock.calls[0]?.[1]
    expect(typeof listener).toBe('function')
    ;(listener as () => void)()
    await Promise.resolve()
    await Promise.resolve()

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('catches rejected registration and warns in DEV mode', async () => {
    const error = new Error('offline')
    const register = vi.fn().mockRejectedValue(error)
    vi.stubGlobal('window', {})
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    vi.stubGlobal('addEventListener', addEventListenerSpy)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    registerServiceWorker()
    const listener = addEventListenerSpy.mock.calls[0]?.[1]
    expect(typeof listener).toBe('function')
    ;(listener as () => void)()
    await Promise.resolve()
    await Promise.resolve()

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(warnSpy).toHaveBeenCalledWith('[APEX PWA] SW registration failed:', error)
  })
})
