import { afterEach, describe, expect, it, vi } from 'vitest'

const renderMock = vi.fn()
const createRootMock = vi.fn(() => ({ render: renderMock }))

vi.mock('react-dom/client', () => ({
  default: { createRoot: createRootMock },
}))

describe('mountOmniHubProof', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    renderMock.mockClear()
    createRootMock.mockClear()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('mounts the proof app into the provided root', async () => {
    const { mountOmniHubProof } = await import('../../../apps/omnihub-proof/src/main')
    const root = document.createElement('div')

    mountOmniHubProof(root)

    expect(createRootMock).toHaveBeenCalledOnce()
    expect(createRootMock).toHaveBeenCalledWith(root)
    expect(renderMock).toHaveBeenCalledOnce()
  })

  it('throws a fail-closed error when the root element is missing', async () => {
    const { mountOmniHubProof } = await import('../../../apps/omnihub-proof/src/main')

    expect(() => mountOmniHubProof(null)).toThrow('APEX OmniHub Proof root element #root not found')
    expect(createRootMock).not.toHaveBeenCalled()
  })

  it('does not auto-mount when imported under Vitest test mode', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('../../../apps/omnihub-proof/src/main')

    expect(createRootMock).not.toHaveBeenCalled()
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('auto-mounts outside Vitest test mode', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.stubEnv('MODE', 'production')

    await import('../../../apps/omnihub-proof/src/main')

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'))
    expect(renderMock).toHaveBeenCalledOnce()
  })
})
