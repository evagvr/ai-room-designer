import useStore from '../../store/useStore'
import './PaletteSelection.css'

const PALETTES = [
    {
        id: 'neutral',
        name: 'Neutru',
        desc: 'Bej, alb, gri cald — clasic și versatil',
        colors: ['#F5F0E8', '#E0D8CC', '#C8BDB0', '#9A8E82'],
    },
    {
        id: 'warm',
        name: 'Cald',
        desc: 'Ocru, teracotă, ambră — cozy și invitant',
        colors: ['#D4895A', '#C0654A', '#8B4513', '#5C3317'],
    },
    {
        id: 'cool',
        name: 'Rece',
        desc: 'Albastru, gri, verde marin — calmant și modern',
        colors: ['#6B8CAE', '#4A7B9D', '#2D6882', '#1A4A5C'],
    },
    {
        id: 'colorful',
        name: 'Colorat',
        desc: 'Accente vibrante, mix îndrăzneț — expresiv',
        colors: ['#C17F3E', '#7B6E8F', '#4A6741', '#C0544B'],
    },
    ]

    export default function PaletteSelection() {
    const { selectedPalettes, togglePalette } = useStore()

    return (
        <div className="palette-selection">
        <h2 className="section-title">Alege paleta de culori</h2>
        <p className="section-sub">
            Poți selecta mai multe palete — culorile influențează sugestiile Agentului AI Designer.
        </p>

        <div className="palettes-grid">
            {PALETTES.map(p => (
            <button
                key={p.id}
                className={`palette-card ${selectedPalettes.includes(p.id) ? 'selected' : ''}`}
                onClick={() => togglePalette(p.id)}
            >
                <div className="palette-colors">
                {p.colors.map((c, i) => (
                    <span key={i} style={{ background: c, flex: 1 }} />
                ))}
                </div>
                <div className="palette-info">
                <strong>{p.name}</strong>
                <p>{p.desc}</p>
                </div>
                {selectedPalettes.includes(p.id) && (
                <div className="palette-check">✓</div>
                )}
            </button>
            ))}
        </div>

        {selectedPalettes.length > 0 && (
            <p className="palette-selected-hint">
            Selectate: <strong>{selectedPalettes.join(', ')}</strong>
            </p>
        )}
        </div>
    )
}