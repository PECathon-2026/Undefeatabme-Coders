import { ScanEye } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { useActivity } from '../lib/activity.js'

// Analysis workspace. Charts arrive with the Dojo stage; for now it lists real Spirit Lens runs.
export default function Dojo({ onNavigate }) {
  const activity = useActivity()
  return (
    <Card title="Processing history" icon={ScanEye}>
      {activity.length === 0 ? (
        <EmptyState message="Charts and statistics appear here after you analyse an image in Spirit Lens.">
          <button type="button" className="button" onClick={() => onNavigate('lens')}>
            Open Spirit Lens
          </button>
        </EmptyState>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <caption>Runs in this browser (most recent first)</caption>
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Action</th>
                <th scope="col">Result</th>
                <th scope="col">Data</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.at}>
                  <td>{a.fileName}</td>
                  <td>{a.action === 'detect' ? 'Detection' : 'Restoration'}</td>
                  <td>{a.action === 'detect' ? `${a.count} candidates` : `${a.width}×${a.height} px`}</td>
                  <td>
                    <StatusBadge dataKind={a.dataKind} />
                  </td>
                  <td>{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(a.at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
