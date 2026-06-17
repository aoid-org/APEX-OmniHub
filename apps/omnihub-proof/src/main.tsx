import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

export function bootstrapOmniHubProof(root: HTMLElement | null): void {
  if (!root) {
    throw new Error('OmniHub Proof root element not found')
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode><App /></React.StrictMode>
  )
}

bootstrapOmniHubProof(document.getElementById('root'))
