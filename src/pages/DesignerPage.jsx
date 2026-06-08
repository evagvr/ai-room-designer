import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import RoomConfig from '../components/Room/RoomConfig'
import FurnitureChat from '../components/Furniture/FurnitureChat'
import RoomCanvas from '../components/Canvas/RoomCanvas'
import ExportPanel from '../components/Export/ExportPanel'
import './DesignerPage.css'

const STEPS = [
  { id: 0, label: 'Camera', desc: 'Dimensiuni' },
  { id: 1, label: 'Mobilier', desc: 'Chat AI' },
  { id: 2, label: 'Layout', desc: 'Agent 2' },
  { id: 3, label: 'Export', desc: 'PDF' },
]

export default function DesignerPage() {
  const { currentStep, setStep, room, selectedFurniture, layout, resetRoom } = useStore()
  const [showConfirm, setShowConfirm] = useState(false)

  // Clamp the active step to avoid out-of-bounds rendering if previous state is cached
  const activeStep = Math.min(Math.max(0, currentStep || 0), STEPS.length - 1)

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      setStep(0)
    }
  }, [currentStep, setStep])

  const canAdvance = () => {
    if (activeStep === 0) return room.length && room.width && room.height
    if (activeStep === 1) return selectedFurniture.length > 0
    if (activeStep === 2) return layout.length > 0
    return true
  }

  const handleNewRoom = () => {
    setShowConfirm(true)
  }

  const handleConfirmNewRoom = () => {
    resetRoom()
    setShowConfirm(false)
  }

  const stepContent = [
    <RoomConfig key={0} />,
    <FurnitureChat key={1} />,
    <RoomCanvas key={2} />,
    <ExportPanel key={3} />,
  ]

  return (
    <div className="designer-page">
      {showConfirm && (
        <div className="new-room-overlay" onClick={() => setShowConfirm(false)}>
          <div className="new-room-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="new-room-dialog-icon">🔄</div>
            <h3>Cameră nouă?</h3>
            <p>Progresul curent va fi șters. Camerele salvate rămân intacte.</p>
            <div className="new-room-dialog-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
                Anulează
              </button>
              <button className="btn btn-primary" onClick={handleConfirmNewRoom}>
                Da, cameră nouă
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="designer-sidebar">
        <h2 className="designer-title">Proiectare cameră</h2>
        <nav className="step-nav">
          {STEPS.map(s => (
            <button
              key={s.id}
              className={`step-item ${activeStep === s.id ? 'active' : ''} ${activeStep > s.id ? 'done' : ''}`}
              onClick={() => activeStep > s.id && setStep(s.id)}
            >
              <span className="step-dot">{activeStep > s.id ? '✓' : s.id + 1}</span>
              <span className="step-info">
                <strong>{s.label}</strong>
                <em>{s.desc}</em>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-new-room">
          <button className="btn-new-room" onClick={handleNewRoom}>
            <span className="btn-new-room-icon">＋</span>
            Cameră nouă
          </button>
        </div>
      </div>

      <div className="designer-content">
        <div className="step-content fade-in" key={activeStep}>
          {stepContent[activeStep]}
        </div>
        <div className="step-footer">
          {activeStep > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(activeStep - 1)}>
              ← Înapoi
            </button>
          )}
          {activeStep < STEPS.length - 1 && (
            <button
              className="btn btn-primary"
              onClick={() => setStep(activeStep + 1)}
              disabled={!canAdvance()}
            >
              Continuă →
            </button>
          )}
          {activeStep === STEPS.length - 1 && (
            <button className="btn btn-accent" onClick={handleNewRoom}>
              ＋ Cameră nouă
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
