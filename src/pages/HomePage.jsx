import { Link } from 'react-router-dom'
import './HomePage.css'

const features = [
  { icon: '⬡', title: 'Configurare cameră', desc: 'Introdu dimensiunile exacte ale camerei tale pentru sugestii precise.' },
  { icon: '◈', title: 'Agent AI Designer', desc: 'Primul agent generează mobilier personalizat după stil, culori și buget.' },
  { icon: '◎', title: 'Agent Optimizer Spațial', desc: 'Al doilea agent calculează poziționarea optimă a mobilierului în cameră.' },
  { icon: '◇', title: 'Canvas interactiv', desc: 'Ajustează manual layout-ul prin drag & drop cu detecție coliziuni.' },
  { icon: '◑', title: 'Export PDF', desc: 'Exportă planul cu layout-ul și lista de cumpărături cu linkuri.' },
  { icon: '◐', title: 'Linkuri magazine RO', desc: 'Prețuri și linkuri directe de la IKEA, Dedeman, Vivre, Mobexpert.' },
]

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-badge">AI Interior Design</div>
        <h1 className="hero-title">
          Proiectează camera<br />
          <em>perfectă pentru tine</em>
        </h1>
        <p className="hero-sub">
          Doi agenți AI lucrează împreună pentru a genera mobilier personalizat,
          a optimiza spațiul și a crea un layout pe care îl poți ajusta liber.
        </p>
        <div className="hero-actions">
          <Link to="/designer" className="btn btn-primary btn-lg">
            Începe proiectarea →
          </Link>
          <Link to="/compare" className="btn btn-ghost btn-lg">
            Compară stiluri
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card card fade-in">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="agents-section">
        <div className="agents-content">
          <h2 className="section-title">Cum funcționează</h2>
          <div className="flow">
            {[
              { step: '01', label: 'Configurează camera', desc: 'Dimensiuni, stil, culori, buget' },
              { step: '02', label: 'Agent 1 generează mobilier', desc: 'Lista cu prețuri și linkuri din magazine românești' },
              { step: '03', label: 'Selectezi ce îți place', desc: 'Bifezi piesele dorite din lista sugerată' },
              { step: '04', label: 'Agent 2 optimizează spațiul', desc: 'Calculează poziții și rotații optime' },
              { step: '05', label: 'Ajustezi pe canvas', desc: 'Drag & drop cu detecție coliziuni în timp real' },
              { step: '06', label: 'Export PDF', desc: 'Plan complet cu shopping list și linkuri' },
            ].map((s, i) => (
              <div key={s.step} className="flow-step">
                <div className="flow-num">{s.step}</div>
                <div className="flow-info">
                  <strong>{s.label}</strong>
                  <span>{s.desc}</span>
                </div>
                {i < 5 && <div className="flow-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
