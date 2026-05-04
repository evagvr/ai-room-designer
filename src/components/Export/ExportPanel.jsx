import { useState } from 'react'
import useStore from '../../store/useStore'
import './ExportPanel.css'

export default function ExportPanel() {
  const { room, selectedStyle, selectedPalettes, furnitureSuggestions, selectedFurniture, layout, maxBudget, isAuthenticated, saveRoom } = useStore()
  const [exportMsg, setExportMsg] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  const selItems = furnitureSuggestions.filter(f => selectedFurniture.includes(f.id))
  const total = selItems.reduce((s, i) => s + (i.price || 0), 0)

  const handleExportPDF = () => {
    const lines = selItems.map(item => {
      const links = (item.storeLinks || []).map(l => `${l.store}: ${l.url}`).join(' | ')
      return `${item.name}\n  Dimensiuni: ${item.width}m × ${item.depth}m × ${item.height}m înălțime\n  Preț: ${(item.price || 0).toLocaleString()} RON\n  Magazine: ${links}`
    })

    const layoutInfo = layout.length > 0
      ? layout.map(i => `  ${i.name}: x=${i.x.toFixed(2)}m, y=${i.y.toFixed(2)}m, rotație=${i.rotation}°`).join('\n')
      : '  Layout negenenat'

    const content = [
      '╔══════════════════════════════════════════════════════╗',
      '║           ATELIER AI — Plan Interior                 ║',
      '╚══════════════════════════════════════════════════════╝',
      '',
      `Data: ${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      '── CONFIGURAȚIE CAMERĂ ────────────────────────────────',
      `Dimensiuni: ${room.length}m × ${room.width}m × ${room.height}m înălțime`,
      `Suprafață: ${(parseFloat(room.length) * parseFloat(room.width)).toFixed(1)} m²`,
      `Stil design: ${selectedStyle || '—'}`,
      `Paletă culori: ${selectedPalettes.join(', ') || '—'}`,
      maxBudget ? `Buget maxim: ${parseInt(maxBudget).toLocaleString()} RON` : '',
      '',
      '── LISTA DE MOBILIER ──────────────────────────────────',
      '',
      ...lines.map((l, i) => `${i + 1}. ${l}`),
      '',
      '──────────────────────────────────────────────────────',
      `TOTAL ESTIMAT: ${total.toLocaleString()} RON`,
      '──────────────────────────────────────────────────────',
      '',
      '── POZIȚII LAYOUT ─────────────────────────────────────',
      layoutInfo,
      '',
      '══════════════════════════════════════════════════════',
      'Generat de Atelier AI — atelier.ai',
      '══════════════════════════════════════════════════════',
    ].filter(l => l !== null).join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atelier-ai-plan-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('✓ Planul a fost descărcat! Deschide fișierul .txt pentru lista completă cu linkuri.')
  }

  const handleSave = () => {
    const name = window.prompt('Numele proiectului:', 'Camera mea')
    if (name) {
      saveRoom(name)
      setSaveMsg('✓ Proiectul a fost salvat în "Camerele mele"!')
    }
  }

  return (
    <div className="export-panel">
      <h2 className="section-title">Export & salvare</h2>
      <p className="section-sub">Exportă planul tău complet sau salvează proiectul pentru mai târziu.</p>

      <div className="export-preview card">
        <h3>Plan — {selectedStyle || 'Custom'} ({room.length}m × {room.width}m)</h3>

        {selItems.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nu ai selectat niciun articol de mobilier.</p>
        ) : (
          <>
            <div className="export-items">
              {selItems.map(item => (
                <div key={item.id} className="export-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color || '#888', flexShrink: 0 }} />
                    <span>{item.name}</span>
                    <span className="exp-dims">{item.width}×{item.depth}m</span>
                  </div>
                  <div className="exp-links">
                    {(item.storeLinks || []).slice(0, 1).map(l => (
                      <a key={l.store} href={l.url} target="_blank" rel="noreferrer" className="store-link">{l.store}</a>
                    ))}
                  </div>
                  <strong className="exp-price">{(item.price || 0).toLocaleString()} RON</strong>
                </div>
              ))}
            </div>
            <div className="export-total">
              <span>Total estimat</span>
              <strong>{total.toLocaleString()} RON</strong>
            </div>
          </>
        )}
      </div>

      <div className="export-actions">
        <button className="btn btn-primary" onClick={handleExportPDF} disabled={selItems.length === 0}>
          ⬇ Export Plan (TXT)
        </button>
        {isAuthenticated ? (
          <button className="btn btn-ghost" onClick={handleSave}>
            ◆ Salvează proiectul
          </button>
        ) : (
          <a href="/login" className="btn btn-ghost">
            Autentifică-te pentru a salva
          </a>
        )}
      </div>

      {exportMsg && <div className="success-banner">{exportMsg}</div>}
      {saveMsg && <div className="success-banner">{saveMsg}</div>}
    </div>
  )
}
