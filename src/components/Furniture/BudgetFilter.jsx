import useStore from '../../store/useStore'

export default function BudgetFilter() {
  const { maxBudget, setMaxBudget } = useStore()

  return (
    <div>
      <h2 className="section-title">Buget maxim</h2>
      <p className="section-sub">
        Opțional — setează un buget maxim pentru a filtra sugestiile Agentului AI Designer.
      </p>
      <div style={{ maxWidth: 400 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
          Agentul AI Designer va sugera mobilier care se încadrează în bugetul specificat.
          Prețurile sunt în lei românești (RON). Poți lăsa gol pentru a vedea toate sugestiile
          indiferent de preț.
        </p>
        <div className="field-group">
          <label className="label">Buget maxim total (RON) — opțional</label>
          <input
            className="input-field"
            type="number"
            min="0"
            step="100"
            placeholder="ex: 15000"
            value={maxBudget}
            onChange={e => setMaxBudget(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>
        {maxBudget && (
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
            Buget setat: <strong>{parseInt(maxBudget).toLocaleString()} RON</strong>
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>
          Agentul va fi instruit să sugereze mobilier care se încadrează în limita bugetului.
        </p>
      </div>
    </div>
  )
}