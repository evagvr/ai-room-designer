import { useState, useRef, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import useStore from '../../store/useStore'
import './ExportPanel.css'

function cleanDiacritics(str) {
  if (!str) return ''
  let clean = String(str)
  
  // Transliterate Romanian diacritics to standard ASCII to prevent encoding/font issues in jsPDF
  clean = clean
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/ș/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ș/g, 'S')
    .replace(/Ş/g, 'S')
    .replace(/ț/g, 't')
    .replace(/ţ/g, 't')
    .replace(/Ț/g, 'T')
    .replace(/Ţ/g, 'T')
    .replace(/×/g, 'x')
    .replace(/²/g, '2')
    .replace(/•/g, '-')
    .replace(/°/g, ' deg')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/”/g, '"')
    .replace(/“/g, '"')
    .replace(/…/g, '...')
  
  return clean
}

export default function ExportPanel() {
  const { room, selectedStyle, selectedPalettes, furnitureSuggestions, selectedFurniture, layout, maxBudget, isAuthenticated, saveRoom } = useStore()
  const [exportMsg, setExportMsg] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('Camera mea')

  const canvasRef = useRef(null)

  const selItems = furnitureSuggestions.filter(f => selectedFurniture.includes(f.id))
  const total = selItems.reduce((s, i) => s + (i.price || 0), 0)

  const rl = parseFloat(room.length) || 5
  const rw = parseFloat(room.width) || 4

  // Draw a high-quality read-only preview of the room layout
  useEffect(() => {
    if (layout.length > 0 && canvasRef.current) {
      const canvas = canvasRef.current
      const scale = Math.min(220 / rl, 160 / rw, 40) // Scale to fit preview box neatly
      const W = Math.round(rl * scale)
      const H = Math.round(rw * scale)
      canvas.width = W
      canvas.height = H
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, W, H)
      
      // Draw background
      ctx.fillStyle = '#1a1a17'
      ctx.fillRect(0, 0, W, H)
      
      // Draw 50cm grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= rl; x += 0.5) {
        ctx.beginPath()
        ctx.moveTo(x * scale, 0)
        ctx.lineTo(x * scale, H)
        ctx.stroke()
      }
      for (let y = 0; y <= rw; y += 0.5) {
        ctx.beginPath()
        ctx.moveTo(0, y * scale)
        ctx.lineTo(W, y * scale)
        ctx.stroke()
      }
      
      // Draw outer walls
      ctx.strokeStyle = 'rgba(200,169,110,0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, W - 2, H - 2)
      
      // Draw each placed furniture item
      layout.forEach(item => {
        const iw = (item.rotation === 90 ? item.depth : item.width) * scale
        const ih = (item.rotation === 90 ? item.width : item.depth) * scale
        const x = item.x * scale
        const y = item.y * scale
        
        ctx.fillStyle = item.color || '#888'
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 1
        ctx.fillRect(x, y, iw, ih)
        ctx.strokeRect(x, y, iw, ih)
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '500 8px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = item.name.length > 11 ? item.name.substring(0, 9) + '…' : item.name
        if (iw > 25 && ih > 14) {
          ctx.fillText(label, x + iw / 2, y + ih / 2)
        }
      })
    }
  }, [layout, rl, rw])

  const handleExportPDF = () => {
    const doc = new jsPDF()
    
    // 1. Premium White Page Setup
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 297, 'F')
    
    // 2. Luxury Header
    doc.setTextColor(34, 34, 32) // Charcoal
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(cleanDiacritics('ATELIER AI'), 20, 25)
    
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(138, 136, 128)
    doc.text(cleanDiacritics('PLAN DE DESIGN INTERIOR SI SPECIFICATII TEHNICE'), 20, 31)
    
    // Date (Right-aligned)
    doc.textAlign = 'right'
    doc.text(cleanDiacritics(`Generat la: ${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}`), 190, 25)
    doc.textAlign = 'left'
    
    // Gold Divider line
    doc.setDrawColor(201, 169, 110)
    doc.setLineWidth(1)
    doc.line(20, 35, 190, 35)
    
    let currentY = 46
    
    // 3. Room Configuration Card
    doc.setDrawColor(220, 218, 212)
    doc.setFillColor(250, 249, 246)
    doc.rect(20, currentY, 170, 32, 'FD')
    
    doc.setTextColor(160, 130, 80) // Dark Gold
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(cleanDiacritics('CONFIGURATIE CAMERA'), 25, currentY + 6)
    
    doc.setTextColor(34, 34, 32)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(cleanDiacritics(`Dimensiuni: ${room.length}m x ${room.width}m x ${room.height}m inaltime`), 25, currentY + 13)
    doc.text(cleanDiacritics(`Suprafata camera: ${(parseFloat(room.length) * parseFloat(room.width)).toFixed(1)} m2`), 25, currentY + 19)
    doc.text(cleanDiacritics(`Stil de design: ${selectedStyle || 'Personalizat'}`), 25, currentY + 25)
    
    if (maxBudget) {
      doc.text(cleanDiacritics(`Buget maxim alocat: ${parseInt(maxBudget).toLocaleString()} RON`), 110, currentY + 13)
    }
    doc.text(cleanDiacritics(`Produse selectate: ${selItems.length} piese`), 110, currentY + 19)
    
    currentY += 42
    
    // 4. Visual Layout (Rendered Canvas)
    if (layout.length > 0 && canvasRef.current) {
      doc.setTextColor(160, 130, 80)
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.text(cleanDiacritics('SCHITA LAYOUT CAMERA (AGENT 2)'), 20, currentY)
      
      const canvas = canvasRef.current
      const imgData = canvas.toDataURL('image/png')
      
      // Calculate display dimensions on the PDF (preserving aspect ratio)
      const displayW = 90
      const displayH = (rw / rl) * displayW
      
      // Draw canvas box border
      doc.setDrawColor(200, 169, 110)
      doc.setLineWidth(0.5)
      doc.rect(20, currentY + 4, displayW, displayH)
      
      // Add image to PDF
      doc.addImage(imgData, 'PNG', 20, currentY + 4, displayW, displayH)
      
      // Add a quick visual description/legend beside the canvas
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 100, 95)
      
      let legendY = currentY + 10
      doc.text(cleanDiacritics('Legenda schita layout:'), 120, legendY)
      doc.text(cleanDiacritics('- Coordonate (X, Y) calculate in metri'), 120, legendY + 5)
      doc.text(cleanDiacritics('- Toate piesele au coliziune zero (non-overlapping)'), 120, legendY + 10)
      doc.text(cleanDiacritics('- Pastreaza spatiul de trecere recomandat'), 120, legendY + 15)
      doc.text(cleanDiacritics('- Culorile reflecta paletele selectate'), 120, legendY + 20)
      
      currentY += displayH + 18
    }
    
    // 5. Furniture list header
    doc.setTextColor(160, 130, 80)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(cleanDiacritics('SPECIFICATII SI LISTA MOBILIER'), 20, currentY)
    
    currentY += 5
    
    // 6. Furniture list items
    selItems.forEach((item, idx) => {
      // If we are reaching the bottom of the page, add a new page!
      if (currentY > 265) {
        doc.addPage()
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, 210, 297, 'F')
        
        // Draw header on new page
        doc.setDrawColor(201, 169, 110)
        doc.setLineWidth(0.5)
        doc.line(20, 15, 190, 15)
        currentY = 25
      }
      
      // Small grey card for each item
      doc.setDrawColor(235, 234, 230)
      doc.setFillColor(252, 252, 250)
      doc.rect(20, currentY, 170, 14, 'FD')
      
      // Item name
      doc.setTextColor(34, 34, 32)
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(cleanDiacritics(`${idx + 1}. ${item.name}`), 24, currentY + 6)
      
      // Price (Right-aligned)
      doc.textAlign = 'right'
      doc.text(cleanDiacritics(`${item.price.toLocaleString()} RON`), 185, currentY + 6)
      doc.textAlign = 'left'
      
      // Specs
      doc.setTextColor(110, 110, 105)
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8)
      
      // Find positioning details if placed
      const pos = layout.find(p => p.id === item.id)
      const posText = pos ? ` | Pozitie: X=${pos.x.toFixed(2)}m, Y=${pos.y.toFixed(2)}m (rot: ${pos.rotation}°)` : ''
      
      doc.text(
        cleanDiacritics(`Dimensiuni: ${item.width}m x ${item.depth}m x ${item.height}m inaltime | Sursa: ${item.store}${posText}`),
        24,
        currentY + 11
      )
      
      currentY += 16
    })
    
    // 7. Total estimation footer card
    if (currentY > 260) {
      doc.addPage()
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, 210, 297, 'F')
      
      doc.setDrawColor(201, 169, 110)
      doc.setLineWidth(0.5)
      doc.line(20, 15, 190, 15)
      currentY = 25
    }
    
    doc.setDrawColor(201, 169, 110)
    doc.setLineWidth(1)
    doc.line(20, currentY, 190, currentY)
    
    doc.setTextColor(34, 34, 32)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(cleanDiacritics('TOTAL GENERAL ESTIMAT:'), 20, currentY + 8)
    
    doc.textAlign = 'right'
    doc.text(cleanDiacritics(`${total.toLocaleString()} RON`), 190, currentY + 8)
    doc.textAlign = 'left'
    
    // Footer description
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 145)
    doc.text(cleanDiacritics('Plan interior de specificatii tehnice generat in timp real de Atelier AI (atelier.ai).'), 20, currentY + 16)
    
    doc.save(`atelier-ai-plan-${Date.now()}.pdf`)
    setExportMsg('✓ Planul PDF a fost generat și descărcat cu succes! Conține schița layout-ului și specificațiile complete.')
  }

  const handleSave = () => {
  setShowSaveInput(true)
  setSaveMsg('')
  }

  const handleConfirmSave = () => {
    const name = saveName.trim()
    if (!name) return
    saveRoom(name)
    setShowSaveInput(false)
    setSaveMsg('✓ Proiectul a fost salvat în "Camerele mele"!')
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
          <div className="export-content-layout">
            {layout.length > 0 && (
              <div className="export-canvas-preview">
                <canvas ref={canvasRef} style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: '#1a1a17' }} />
                <span className="canvas-preview-hint">Schița layout-ului vizual</span>
              </div>
            )}
            <div className="export-details-panel">
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
            </div>
          </div>
        )}
      </div>

      <div className="export-actions">
        <button className="btn btn-primary" onClick={handleExportPDF} disabled={selItems.length === 0}>
          ⬇ Export Plan (PDF)
        </button>
        {isAuthenticated ? (
          <>
              <button className="btn btn-ghost" onClick={handleSave}>
                ◆ Salvează proiectul
              </button>
              {showSaveInput && (
                <div className="save-input-row">
                  <input
                    className="save-name-input"
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
                    placeholder="Numele proiectului"
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleConfirmSave}>
                    Salvează
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowSaveInput(false)}>
                    Anulează
                  </button>
                </div>
              )}
          </>
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
