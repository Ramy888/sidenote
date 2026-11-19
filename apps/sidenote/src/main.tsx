import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupIonicReact } from '@ionic/react'
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import './index.css'
import App from './App.tsx'

setupIonicReact()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// shortcut: day-1 spike runs on native launch; remove when the real pipeline lands (T1).
import { Capacitor } from '@capacitor/core'
if (Capacitor.isNativePlatform()) import('./spikes/t18').then(m => m.runT18())
