import { useState } from 'react'
import useStore from '../../store/useStore'
import './RoomConfig.css'

export default function RoomConfig() {
    const { room, setRoom } = useStore()
    const [errors, setErrors] = useState({})

    const validate = (name, value) => {
    const num = parseFloat(value)
    if (!value) return 'Câmp obligatoriu'
    if (isNaN(num) || num <= 0) return 'Valoare invalidă'
    if (num < 1) return 'Minim 1m'
    if (num > 30) return 'Maxim 30m'
    return ''
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setRoom({ ...room, [name]: value })
        setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    }

    const fields = [
        { name: 'length', label: 'Lungime (m)', placeholder: 'ex: 5.5' },
        { name: 'width', label: 'Lățime (m)', placeholder: 'ex: 4.0' },
        { name: 'height', label: 'Înălțime tavan (m)', placeholder: 'ex: 2.7' },
    ]

    const area = room.length && room.width
    ? (parseFloat(room.length) * parseFloat(room.width)).toFixed(1)
    : null

    return (
    <div className="room-config">
        <h2 className="section-title">Configurează camera</h2>
        <p className="section-sub">Introdu dimensiunile camerei tale pentru sugestii precise.</p>

        <div className="room-inputs">
            {fields.map(f => (
            <div key={f.name} className="field-group">
                <label className="label">{f.label}</label>
                <input
                className={`input-field ${errors[f.name] ? 'error' : ''}`}
                type="number"
                name={f.name}
                value={room[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                step="0.1"
                min="1"
                max="30"
                />
                {errors[f.name] && <span className="error-msg">{errors[f.name]}</span>}
            </div>
            ))}
        </div>

        {area && (
            <div className="room-preview card">
            <div className="room-viz">
                <div
                className="room-rect"
                style={{
                    width: `${Math.min(280, parseFloat(room.length) * 40)}px`,
                    height: `${Math.min(200, parseFloat(room.width) * 40)}px`,
                }}
                >
                <span className="room-dim room-dim-w">{room.length}m</span>
                <span className="room-dim room-dim-h">{room.width}m</span>
                </div>
            </div>
            <div className="room-stats">
                <div className="stat">
                    <strong>{area}</strong>
                    <span>m² suprafață</span>
                </div>
                <div className="stat">
                    <strong>{room.height}m</strong>
                    <span>înălțime</span>
                </div>
                <div className="stat">
                    <strong>{(parseFloat(area) * parseFloat(room.height || 0)).toFixed(1)}</strong>
                    <span>m³ volum</span>
                </div>
            </div>
        </div>
    )}
    </div>
)
}