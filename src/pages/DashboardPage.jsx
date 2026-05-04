import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import './DashboardPage.css'

export default function DashboardPage() {
  const { savedRooms, deleteRoom, renameRoom, loadRoom, setStep } = useStore()
  const navigate = useNavigate()
  const [renamingId, setRenamingId] = useState(null)
  const [renameVal, setRenameVal] = useState('')

  const handleLoad = (id) => {
    loadRoom(id)
    setStep(5)
    navigate('/designer')
  }

  const handleDelete = (id) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest proiect?')) deleteRoom(id)
  }

  const startRename = (room) => {
    setRenamingId(room.id)
    setRenameVal(room.name)
  }

  const commitRename = () => {
    if (renameVal.trim()) renameRoom(renamingId, renameVal.trim())
    setRenamingId(null)
  }

  return (
    <div className="dashboard-page">
      <h2 className="section-title">Camerele mele</h2>
      <p className="section-sub">Proiectele tale de design interior salvate.</p>

      {savedRooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◇</div>
          <p>Nu ai niciun proiect salvat încă.</p>
          <button className="btn btn-primary" onClick={() => navigate('/designer')}>
            Deschide Designer →
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {savedRooms.map(room => (
            <div key={room.id} className="room-card card">
              <div className="room-card-header">
                {renamingId === room.id ? (
                  <input
                    className="input-field rename-input"
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => e.key === 'Enter' && commitRename()}
                    autoFocus
                  />
                ) : (
                  <h4>{room.name}</h4>
                )}
              </div>
              <div className="room-card-meta">
                <span>{room.config.length}m × {room.config.width}m × {room.config.height}m</span>
                <span>Stil: <strong>{room.style || '—'}</strong></span>
                <span>{room.selectedFurniture?.length || 0} piese selectate</span>
                <span className="room-date">{new Date(room.createdAt).toLocaleDateString('ro-RO')}</span>
              </div>
              <div className="room-card-btns">
                <button className="rc-btn" onClick={() => handleLoad(room.id)}>Deschide</button>
                <button className="rc-btn" onClick={() => startRename(room)}>Redenumește</button>
                <button className="rc-btn danger" onClick={() => handleDelete(room.id)}>Șterge</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
