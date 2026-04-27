// src/components/Room/RoomConfig.jsx
export default function RoomConfig() {
return (
    <div className="room-config">
        <h2>Configurează camera</h2>
        <div className="room-inputs">
        <div className="field-group">
            <label>Lungime (m)</label>
            <input type="number" name="length" placeholder="ex: 5.5" />
        </div>
        <div className="field-group">
            <label>Lățime (m)</label>
            <input type="number" name="width" placeholder="ex: 4.0" />
        </div>
            <div className="field-group">
                <label>Înălțime tavan (m)</label>
                <input type="number" name="height" placeholder="ex: 2.7" />
            </div>
        </div>
    </div>
)
}