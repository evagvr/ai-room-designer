import { useState } from 'react'
import useStore from '../store/useStore'
import RoomConfig from '../components/Room/RoomConfig'
import StyleSelection from '../components/Room/StyleSelection'
import PaletteSelection from '../components/Room/PaletteSelection'
import BudgetFilter from '../components/Furniture/BudgetFilter'
import FurnitureSuggestions from '../components/Furniture/FurnitureSuggestions'
import RoomCanvas from '../components/Canvas/RoomCanvas'
import ExportPanel from '../components/Export/ExportPanel'
import './DesignerPage.css'

const STEPS = [
  { id: 0, label: 'Camera', desc: 'Dimensiuni' },
  { id: 1, label: 'Stil', desc: 'Estetică' },
  { id: 2, label: 'Culori', desc: 'Paletă' },
  { id: 3, label: 'Buget', desc: 'Filtrare' },
  { id: 4, label: 'Mobilier', desc: 'Agent 1' },
  { id: 5, label: 'Layout', desc: 'Agent 2' },
  { id: 6, label: 'Export', desc: 'PDF' },
]

export default function DesignerPage() {
  const { currentStep, setStep, room, selectedStyle, selectedPalettes, selectedFurniture, layout } = useStore()

  const canAdvance = () => {
    if (currentStep === 0) return room.length && room.width && room.height
    if (currentStep === 1) return selectedStyle
    if (currentStep === 2) return selectedPalettes.length > 0
    if (currentStep === 4) return selectedFurniture.length > 0
    if (currentStep === 5) return layout.length > 0
    return true
  }

  const stepContent = [
    <RoomConfig key={0} />,
    <StyleSelection key={1} />,
    <PaletteSelection key={2} />,
    <BudgetFilter key={3} />,
    <FurnitureSuggestions key={4} />,
    <RoomCanvas key={5} />,
    <ExportPanel key={6} />,
  ]

  return (
    <div className="designer-page">
      <div className="designer-sidebar">
        <h2 className="designer-title">Proiectare cameră</h2>
        <nav className="step-nav">
          {STEPS.map(s => (
            <button
              key={s.id}
              className={`step-item ${currentStep === s.id ? 'active' : ''} ${currentStep > s.id ? 'done' : ''}`}
              onClick={() => currentStep > s.id && setStep(s.id)}
            >
              <span className="step-dot">{currentStep > s.id ? '✓' : s.id + 1}</span>
              <span className="step-info">
                <strong>{s.label}</strong>
                <em>{s.desc}</em>
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="designer-content">
        <div className="step-content fade-in" key={currentStep}>
          {stepContent[currentStep]}
        </div>
        <div className="step-footer">
          {currentStep > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(currentStep - 1)}>
              ← Înapoi
            </button>
          )}
          {currentStep < STEPS.length - 1 && (
            <button
              className="btn btn-primary"
              onClick={() => setStep(currentStep + 1)}
              disabled={!canAdvance()}
            >
              Continuă →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
