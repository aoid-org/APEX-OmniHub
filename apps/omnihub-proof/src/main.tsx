import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

export function mountOmniHubProof(root: HTMLElement | null = document.getElementById('root')): void {
  if (!root) {
    throw new Error('APEX OmniHub Proof root element #root not found')
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

if (import.meta.env.MODE !== 'test') {
  mountOmniHubProof()
}
