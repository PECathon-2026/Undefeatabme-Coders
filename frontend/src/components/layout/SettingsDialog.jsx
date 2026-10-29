import { Trash2 } from 'lucide-react'
import Dialog from '../ui/Dialog.jsx'
import { useToast } from '../ui/toastContext.js'
import { API_BASE_URL, USE_MOCK } from '../../services/api.js'

// Keys this app writes to localStorage (settings are kept).
const SAVED_DATA_KEYS = ['tw-activity', 'tw-favorites', 'tw-reminders', 'tw-saved-events']

export default function SettingsDialog({ open, onClose, settings, onChange }) {
  const toast = useToast()

  function toggle(key) {
    onChange((s) => ({ ...s, [key]: !s[key] }))
  }

  function clearSavedData() {
    SAVED_DATA_KEYS.forEach((key) => localStorage.removeItem(key))
    toast.show('Saved data cleared from this browser. Reloading...', 'info')
    setTimeout(() => window.location.reload(), 900)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <button type="button" className="button button-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <label className="switch">
        <span className="switch-text">
          <span>Reduce motion</span>
          <span className="fine-print">Turns off page transitions, twinkling stars and drifting mist. Your system setting is always respected.</span>
        </span>
        <input type="checkbox" checked={settings.reduceMotion} onChange={() => toggle('reduceMotion')} />
      </label>
      <label className="switch">
        <span className="switch-text">
          <span>Atmosphere effects</span>
          <span className="fine-print">Stars, mountains and mist in the background.</span>
        </span>
        <input type="checkbox" checked={settings.atmosphere} onChange={() => toggle('atmosphere')} />
      </label>

      <dl className="facts">
        <dt>Data source</dt>
        <dd>{USE_MOCK ? 'Demo data (MOCK)' : 'Backend API'}</dd>
        <dt>API address</dt>
        <dd>{API_BASE_URL || 'same origin'}</dd>
      </dl>
      <p className="fine-print">
        Data mode is chosen when the app is built (VITE_USE_MOCK). Nothing you save here leaves this browser.
      </p>

      <button type="button" className="button button-danger" onClick={clearSavedData}>
        <Trash2 size={16} aria-hidden="true" />
        Clear saved data in this browser
      </button>
    </Dialog>
  )
}
