import React, { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import './shared/design-system/tokens.css'

class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Wavult OS] Fatal render error:', error, info)
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0A', color: '#F4F4F5', fontFamily: 'monospace',
          padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#52525B', marginBottom: '1.5rem' }}>
            WAVULT OS — SYSTEM ERROR
          </div>
          <div style={{ fontSize: '14px', color: '#EF4444', marginBottom: '1rem', maxWidth: '600px' }}>
            {err.message}
          </div>
          <div style={{ fontSize: '11px', color: '#3F3F46', maxWidth: '700px', lineHeight: 1.6, marginBottom: '2rem' }}>
            {err.stack?.split('\n').slice(0, 4).join('\n')}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ padding: '0.5rem 1.5rem', background: '#1A1A1A', color: '#fff', border: '1px solid #333', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.1em' }}
          >
            RELOAD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
      // Do NOT throw errors to React tree — handle via isError state
      throwOnError: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
)
// mapbox token env Sat Mar 28 14:28:17 CET 2026
