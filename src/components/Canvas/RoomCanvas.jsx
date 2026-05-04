import { useEffect, useRef, useState } from 'react'
import useStore from '../../store/useStore'
import { runAgent2, checkCollisions } from '../../agents/agent2Optimizer'
import './RoomCanvas.css'

export default function RoomCanvas() {
  const {
    room, furnitureSuggestions, selectedFurniture,
    layout, setLayout,
    layoutVariants, setLayoutVariants,
    activeVariant, setActiveVariant,
  } = useStore()

  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Gata să calculeze layout-ul optim')
  const [hasError, setHasError] = useState(false)
  const [currentLayout, setCurrentLayout] = useState(layout)
  const dragging = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(60)

  const selectedItems = furnitureSuggestions.filter(f => selectedFurniture.includes(f.id))
  const rl = parseFloat(room.length) || 5
  const rw = parseFloat(room.width) || 4

  useEffect(() => {
    if (currentLayout.length > 0) drawCanvas()
  }, [currentLayout])

  useEffect(() => {
    setCurrentLayout(layout)
  }, [layout])

  function getScale() {
    const canvas = canvasRef.current
    if (!canvas) return 60
    const maxW = Math.min(canvas.parentElement?.clientWidth - 40 || 500, 580)
    return Math.min(maxW / rl, (maxW * 0.7) / rw, 90)
  }

  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = getScale()
    scaleRef.current = scale
    const W = Math.round(rl * scale)
    const H = Math.round(rw * scale)
    canvas.width = W; canvas.height = H
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#1a1a17'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(200,169,110,0.6)'; ctx.lineWidth = 2
    ctx.strokeRect(1, 1, W - 2, H - 2)
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5
    for (let x = 0; x <= rl; x += 0.5) { ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, H); ctx.stroke() }
    for (let y = 0; y <= rw; y += 0.5) { ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(W, y * scale); ctx.stroke() }
    // Meter labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px monospace'
    for (let x = 1; x <= rl; x++) { if (x * scale < W - 10) ctx.fillText(x + 'm', x * scale - 12, H - 4) }
    for (let y = 1; y <= rw; y++) { if (y * scale < H - 10) ctx.fillText(y + 'm', 4, y * scale - 4) }
    const cols = checkCollisions(currentLayout)
    currentLayout.forEach(item => {
      const iw = (item.rotation === 90 ? item.depth : item.width) * scale
      const ih = (item.rotation === 90 ? item.width : item.depth) * scale
      const x = item.x * scale, y = item.y * scale
      const isColliding = cols.has(item.id)
      const isDragged = dragging.current?.id === item.id
      ctx.fillStyle = isColliding
        ? 'rgba(192,84,75,0.3)'
        : (item.color || '#888') + (isDragged ? 'ee' : '99')
      ctx.strokeStyle = isColliding ? '#C0544B' : isDragged ? '#fff' : 'rgba(255,255,255,0.25)'
      ctx.lineWidth = isColliding ? 2 : 1
      ctx.fillRect(x, y, iw, ih)
      ctx.strokeRect(x, y, iw, ih)
      ctx.fillStyle = isColliding ? '#ff9090' : 'rgba(255,255,255,0.9)'
      const fSize = Math.max(9, Math.min(12, iw / 8))
      ctx.font = `500 ${fSize}px system-ui`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const label = item.name.length > 14 ? item.name.substring(0, 12) + '…' : item.name
      if (iw > 40 && ih > 20) ctx.fillText(label, x + iw / 2, y + ih / 2)
    })
  }

  function getPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const s = scaleRef.current
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s }
  }

  function onMouseDown(e) {
    const p = getPoint(e)
    for (let i = currentLayout.length - 1; i >= 0; i--) {
      const item = currentLayout[i]
      const iw = item.rotation === 90 ? item.depth : item.width
      const ih = item.rotation === 90 ? item.width : item.depth
      if (p.x >= item.x && p.x <= item.x + iw && p.y >= item.y && p.y <= item.y + ih) {
        dragging.current = item
        dragOffset.current = { x: p.x - item.x, y: p.y - item.y }
        canvasRef.current.style.cursor = 'grabbing'
        return
      }
    }
  }

  function onMouseMove(e) {
    if (!dragging.current) return
    const p = getPoint(e)
    const item = dragging.current
    const iw = item.rotation === 90 ? item.depth : item.width
    const ih = item.rotation === 90 ? item.width : item.depth
    item.x = Math.max(0, Math.min(rl - iw, p.x - dragOffset.current.x))
    item.y = Math.max(0, Math.min(rw - ih, p.y - dragOffset.current.y))
    drawCanvas()
  }

  function onMouseUp() {
    if (dragging.current) {
      dragging.current = null
      canvasRef.current.style.cursor = 'default'
      const updated = [...currentLayout]
      setCurrentLayout(updated)
      setLayout(updated)
    }
  }

  function onTouchStart(e) {
    const t = e.touches[0]
    onMouseDown({ clientX: t.clientX, clientY: t.clientY })
  }
  function onTouchMove(e) {
    e.preventDefault()
    const t = e.touches[0]
    onMouseMove({ clientX: t.clientX, clientY: t.clientY })
  }

  const handleGenerate = async (addVariant = false) => {
    setLoading(true); setHasError(false)
    setStatus(addVariant ? 'Generare variantă alternativă...' : 'Calcul poziții optime...')
    try {
      const variantNum = addVariant ? layoutVariants.length : 0
      const newLayout = await runAgent2({ room, selectedItems, variant: variantNum })
      if (addVariant) {
        const updated = [...layoutVariants, newLayout]
        setLayoutVariants(updated)
        setActiveVariant(updated.length - 1)
      } else {
        setLayoutVariants([newLayout])
        setActiveVariant(0)
      }
      setLayout(newLayout)
      setCurrentLayout(newLayout)
      setStatus(`Layout generat: ${newLayout.length} piese poziționate ✓`)
    } catch {
      setHasError(true)
      setStatus('Eroare — layout automat aplicat')
    }
    setLoading(false)
  }

  const switchVariant = (i) => {
    setActiveVariant(i)
    setLayout(layoutVariants[i])
    setCurrentLayout(layoutVariants[i])
  }

  const cols = checkCollisions(currentLayout)

  return (
    <div className="room-canvas-step">
      <h2 className="section-title">Layout cameră</h2>
      <p className="section-sub">Agentul AI Optimizer calculează pozițiile optime ale mobilierului.</p>

      <div className={`agent-banner ${hasError ? 'error' : loading ? 'running' : currentLayout.length > 0 ? 'done' : ''}`}>
        <div className={`agent-dot ${loading ? 'loading' : hasError ? 'error' : ''}`} />
        <div className="agent-info">
          <strong>Agent 2 — Spatial Optimizer</strong>
          <span>{status}</span>
        </div>
        <button className="run-btn" onClick={() => handleGenerate(false)} disabled={loading}>
          {loading ? <><span className="spinner" /> Calculează...</> : '◎ Generează layout'}
        </button>
      </div>

      {layoutVariants.length > 0 && (
        <div className="variants-row">
          {layoutVariants.map((_, i) => (
            <button
              key={i}
              className={`variant-btn ${activeVariant === i ? 'active' : ''}`}
              onClick={() => switchVariant(i)}
            >
              Variantă {i + 1}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => handleGenerate(true)} disabled={loading}>
            + Altă variantă
          </button>
        </div>
      )}

      <div className="canvas-layout">
        <div className="canvas-panel">
          <div className="canvas-outer">
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onMouseUp}
              style={{ cursor: 'default', display: 'block' }}
            />
            {currentLayout.length === 0 && (
              <div className="canvas-empty">
                <p>Apasă "Generează layout" pentru a vedea planul camerei.</p>
              </div>
            )}
          </div>
          <p className="canvas-hint">
            Drag & drop pentru a rearanja mobilierul.{' '}
            {cols.size > 0 && <span style={{ color: 'var(--danger)' }}>⚠ {cols.size} piese se suprapun.</span>}
          </p>
        </div>

        {currentLayout.length > 0 && (
          <div className="canvas-legend">
            <div className="legend-title">Mobilier plasat</div>
            {currentLayout.map(item => (
              <div key={item.id} className="legend-item">
                <div className="legend-dot" style={{ background: cols.has(item.id) ? 'var(--danger)' : item.color || '#888' }} />
                <span>{item.name}</span>
                <span className="legend-pos">{item.x.toFixed(1)},{item.y.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
