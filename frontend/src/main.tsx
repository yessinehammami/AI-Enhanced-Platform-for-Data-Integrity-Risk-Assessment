import { render } from 'preact'
import './index.css'
import App from './app.tsx'
import './i18n';




render(
  <App />,
  document.getElementById('app')!
)
