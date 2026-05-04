import useStore from '../../store/useStore'
import './StyleSelection.css'

const STYLES = [
    {
        id: 'minimalist',
        name: 'Minimalist',
        desc: 'Linii curate, spații libere, funcționalitate pură',
        colors: ['#F5F5F0', '#2C2C2C', '#E8E8E2', '#9A9A90'],
        emoji: '○',
    },
    {
        id: 'scandinavian',
        name: 'Scandinav',
        desc: 'Lemn natural, lumini calde, confort organic',
        colors: ['#FFFFFF', '#A0856C', '#4A6741', '#E8D5B0'],
        emoji: '◇',
    },
    {
        id: 'industrial',
        name: 'Industrial',
        desc: 'Metal, beton, texturi brute și autentice',
        colors: ['#4A4A4A', '#8B7355', '#C0C0C0', '#2A2A2A'],
        emoji: '▣',
    },
    {
        id: 'bohemian',
        name: 'Boem',
        desc: 'Culori vibrante, texturi layered, spirit liber',
        colors: ['#D4956A', '#7B6E8F', '#C17F3E', '#8B4513'],
        emoji: '❋',
    },
    {
        id: 'modern',
        name: 'Modern',
        desc: 'Contraste puternice, materiale premium, accent bold',
        colors: ['#1A1A2E', '#E94560', '#F5F5F5', '#16213E'],
        emoji: '◆',
    },
]

export default function StyleSelection() {
    const { selectedStyle, setStyle } = useStore()

    return (
        <div className="style-selection">
        <h2 className="section-title">Alege stilul tău</h2>
        <p className="section-sub">Stilul ales ghidează sugestiile agentului AI pentru mobilier și culori.</p>

        <div className="styles-grid">
            {STYLES.map(s => (
            <button
                key={s.id}
                className={`style-card ${selectedStyle === s.id ? 'selected' : ''}`}
                onClick={() => setStyle(s.id)}
            >
                <div className="style-swatches">
                {s.colors.map((c, i) => (
                    <div key={i} className="swatch" style={{ background: c }} />
                ))}
                </div>
                <div className="style-emoji">{s.emoji}</div>
                <div className="style-info">
                <strong>{s.name}</strong>
                <p>{s.desc}</p>
                </div>
                {selectedStyle === s.id && <div className="style-check">✓</div>}
            </button>
            ))}
        </div>
        </div>
    )
}