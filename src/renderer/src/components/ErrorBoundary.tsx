import { Component, type ReactNode, type ErrorInfo } from 'react'
import { getT } from '../i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const t = getT()

      return (
        <div className="h-full flex flex-col items-center justify-center p-8 themed-bg-content">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold themed-text-primary mb-2">{t('errorBoundary.title')}</h3>
          <p className="text-sm themed-text-muted mb-1 text-center max-w-md">
            {this.state.error?.message || t('errorBoundary.unknownError')}
          </p>
          <p className="text-xs themed-text-dimmed mb-6 text-center max-w-md">
            {t('errorBoundary.hint')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg themed-bg-card themed-text-secondary text-sm border themed-border-secondary hover:themed-bg-hover transition-colors"
            >
              {t('errorBoundary.reset')}
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg themed-btn-primary text-sm font-medium transition-colors"
            >
              {t('errorBoundary.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
