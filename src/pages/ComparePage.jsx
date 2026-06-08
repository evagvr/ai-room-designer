import { useState } from 'react'
import { runAgent1 } from '../agents/agent1Designer'
import './ComparePage.css'

const STYLES = [
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'scandinavian', name: 'Scandinav' },
  { id: 'industrial', name: 'Industrial' },
  { id: 'bohemian', name: 'Boem' },
  { id: 'modern', name: 'Modern' },
]

const DEFAULT_ROOM = { length: '5', width: '4', height: '2.7' }

export default function ComparePage() {
  const [leftStyle, setLeftStyle] = useState('minimalist')
  const [rightStyle, setRightStyle] = useState('scandinavian')
  const [leftItems, setLeftItems] = useState([])
  const [rightItems, setRightItems] = useState([])
  const [loading, setLoading] = useState(false)

  const runCompare = async () => {
    setLoading(true)
    setLeftItems([])
    setRightItems([])
    const [l, r] = await Promise.all([
      runAgent1({ room: DEFAULT_ROOM, style: leftStyle, palettes: ['neutral'], maxBudget: '' }),
      runAgent1({ room: DEFAULT_ROOM, style: rightStyle, palettes: ['neutral'], maxBudget: '' }),
    ])
    setLeftItems(l)
    setRightItems(r)
    setLoading(false)
  }

  return (
    <div className="compare-page">
      <h2 className="section-title">Comparare stiluri</h2>
      <p className="section-sub">Compară două stiluri de design față în față pentru camera ta.</p>

      <div className="compare-controls">
        <div className="field-group">
          <label className="label">Stil stânga</label>
          <select className="select-field" value={leftStyle} onChange={e => setLeftStyle(e.target.value)}>
            {STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="vs-label">VS</div>
        <div className="field-group">
          <label className="label">Stil dreapta</label>
          <select className="select-field" value={rightStyle} onChange={e => setRightStyle(e.target.value)}>
            {STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={runCompare} disabled={loading}>
          {loading ? <><span className="spinner" /> Generare...</> : '✦ Generează comparație'}
        </button>
      </div>

      <div className="compare-cols">
        <CompareColumn
          style={STYLES.find(s => s.id === leftStyle)}
          items={leftItems}
          loading={loading}
        />
        <CompareColumn
          style={STYLES.find(s => s.id === rightStyle)}
          items={rightItems}
          loading={loading}
        />
      </div>
    </div>
  )
}

function CompareColumn({ style, items, loading }) {
  return (
    <div className="compare-col card">
      <h3 className="compare-col-title">{style?.name}</h3>
      {loading ? (
        <div className="compare-loading">
          <span className="spinner" />
          <p>Generare sugestii AI...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="compare-empty">
          <p>Apasă "Generează comparație" pentru a vedea sugestii AI pentru acest stil.</p>
        </div>
      ) : (
        <div className="compare-items">
          {items.slice(0, 6).map(item => (
            <div key={item.id} className="compare-item">
              <div className="ci-color" style={{ background: item.color }} />
              <div className="ci-info">
                <strong>{item.name}</strong>
                <span>{item.description}</span>
                <div className="ci-links">
                  {(item.storeLinks || []).slice(0, 1).map(l => (
                    <a key={l.store} href={l.url} target="_blank" rel="noreferrer" className="fi-link">{l.store}</a>
                  ))}
                </div>
              </div>
              <span className="ci-price">{(item.price || 0).toLocaleString()} RON</span>
            </div>
          ))}
          <div className="compare-total">
            Total estimat: <strong>{items.reduce((s, i) => s + (i.price || 0), 0).toLocaleString()} RON</strong>
          </div>
        </div>
      )}
    </div>
  )
}
