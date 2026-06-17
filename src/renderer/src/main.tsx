import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/electron/renderer'
import App from './App'
import './index.css'

// Sentry 错误上报初始化
Sentry.init({
  dsn: 'https://a6e6ffc412dee2bb97d28593586aaa38@o4509074522701824.ingest.de.sentry.io/4509074524733520',
  environment: 'production',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
