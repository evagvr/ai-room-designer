import { useState } from 'react'
import useStore from '../../store/useStore'
import { runAgent1 } from '../../agents/agent1Designer'
import { getFurnitureImage, getFurnitureImageFallback } from '../../utils/furnitureImages'
import { normalizeProductDims } from '../../utils/dimensions'
import './FurnitureSuggestions.css'

export default function FurnitureSuggestions() {
  const {
    room, selectedStyle, selectedPalettes, maxBudget,
    furnitureSuggestions, setFurnitureSuggestions,
    selectedFurniture, toggleFurnitureItem,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Gata să caute mobilier în catalog')
  const [hasError, setHasError] = useState(false)

  const selTotal = selectedFurniture.reduce((acc, id) => {
    const item = furnitureSuggestions.find(f => f.id === id)
    return acc + (item?.price || 0)
  }, 0)
  const budget = parseInt(maxBudget) || 0
  const overBudget = budget > 0 && selTotal > budget

  const handleGenerate = async () => {
    setLoading(true)
    setHasError(false)
    setStatus('Agent 1 caută mobilier în catalog...')
    try {
      const items = await runAgent1({
        room, style: selectedStyle, palettes: selectedPalettes, maxBudget,
      })
      setFurnitureSuggestions(items.map(normalizeProductDims))
      setStatus(`${items.length} produse găsite în catalog ✓`)
    } catch {
      setHasError(true)
      setStatus('Eroare la generare — se folosesc sugestii predefinite')
    }
    setLoading(false)
  }

  return (
    <div className="furniture-suggestions">
      <h2 className="section-title">Mobilier sugerat</h2>
      <p className="section-sub">Agentul filtrează produse reale din catalog după stilul camerei, buget și dimensiuni.</p>

      <div className={`agent-banner ${hasError ? 'error' : loading ? 'running' : furnitureSuggestions.length > 0 ? 'done' : ''}`}>
        <div className={`agent-dot ${loading ? 'loading' : hasError ? 'error' : ''}`} />
        <div className="agent-info">
          <strong>Agent 1 — AI Designer</strong>
          <span>{status}</span>
        </div>
        <button className="run-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? <><span className="spinner" /> Caută...</> : '✦ Caută în catalog'}
        </button>
      </div>

      {overBudget && (
        <div className="over-budget-warn">
          ⚠ Mobilierul selectat ({selTotal.toLocaleString()} RON) depășește bugetul de {budget.toLocaleString()} RON.
        </div>
      )}

      {selectedFurniture.length > 0 && (
        <div className="budget-tracker">
          <span className="bt-label">Total selectat</span>
          <div className="bt-bar">
            <div
              className={`bt-fill ${overBudget ? 'over' : ''}`}
              style={{ width: budget > 0 ? `${Math.min(100, selTotal / budget * 100)}%` : '0%' }}
            />
          </div>
          <span className={`bt-total ${overBudget ? 'over' : ''}`}>
            {selTotal.toLocaleString()} RON{budget > 0 ? ` / ${budget.toLocaleString()}` : ''}
          </span>
        </div>
      )}

      {furnitureSuggestions.length > 0 ? (
        <>
          <div className="select-hint">
            {selectedFurniture.length === 0
              ? 'Selectează piesele dorite pentru a genera layout-ul.'
              : `${selectedFurniture.length} piese selectate`}
          </div>
          <div className="furniture-grid">
            {furnitureSuggestions.map(item => (
              <FurnitureCard
                key={item.id}
                item={item}
                selected={selectedFurniture.includes(item.id)}
                onToggle={() => toggleFurnitureItem(item.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-furniture">
          <div className="ef-icon">◈</div>
          <p>Apasă <strong>"Caută în catalog"</strong> pentru a vedea produse reale
            bazate pe stilul <strong>{selectedStyle}</strong> și paleta ta de culori.</p>
        </div>
      )}
    </div>
  )
}
function FurnitureCard({ item, selected, onToggle }) {
  const imageUrl = getFurnitureImage(item)
  const fallbackUrl = getFurnitureImageFallback(item)

  return (
    <div className={`furniture-card ${selected ? 'selected' : ''}`} onClick={onToggle}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
      />
      <div className="fc-image-wrapper">
        <img
          src={imageUrl}
          alt={item.name}
          className="fc-image"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackUrl) {
              e.currentTarget.src = fallbackUrl
            }
          }}
        />
        <span className="fc-color-badge" style={{ background: item.color || '#888' }} title={item.colorName || 'Culoare'} />
      </div>
      <div className="fc-info">
        <strong>{item.name}</strong>
        <p className="fc-desc">{item.description}</p>
        <span className="fc-dims">{item.width}m × {item.depth}m × {item.height}m înălțime</span>
        <div className="fc-links">
          {(item.storeLinks || []).map(l => (
            // ✅ S-a adăugat tag-ul 'a' corect aici
            <a 
              key={l.store}
              className="store-link"
              href={l.url}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >
              {l.store} — {(l.price || item.price).toLocaleString()} RON
            </a>
          ))}
        </div>
      </div>
      <div className="fc-price">{(item.price || 0).toLocaleString()} RON</div>
    </div>
  )
}