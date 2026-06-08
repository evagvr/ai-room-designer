import { useRef, useEffect, useState } from 'react'
import useStore from '../../store/useStore'
import { searchFurniture } from '../../agents/furnitureSearch'
import { getFurnitureImage, getFurnitureImageFallback } from '../../utils/furnitureImages'
import { normalizeProductDims } from '../../utils/dimensions'
import './FurnitureChat.css'

function toCanvasProduct(product) {
  const p = normalizeProductDims(product)
  return {
    id: `db-${product.id}`,
    name: product.name,
    category: product.category,
    width: p.width,
    depth: p.depth,
    height: p.height,
    color: product.color || product.color_hex || '#888888',
    colorName: product.colorName || product.color_name || '',
    price: parseFloat(product.price),
    description: product.description,
    image_url: product.image_url,
    style: product.style,
    source: product.store,
    url: product.url,
    storeLinks: [
      {
        store: product.store,
        url: product.url,
        price: parseFloat(product.price),
      },
    ],
  }
}

function ProductCard({ product, added, onAddToRoom }) {
  const canvasItem = toCanvasProduct(product)
  const imageUrl = getFurnitureImage(product)
  const fallbackUrl = getFurnitureImageFallback(product)

  return (
    <article className="product-card">
      <div className="pc-image-wrapper">
        <img
          src={imageUrl}
          alt={product.name}
          className="pc-image"
          onError={(e) => {
            if (e.currentTarget.src !== fallbackUrl) {
              e.currentTarget.src = fallbackUrl
            }
          }}
        />
        <span className="pc-color-badge" style={{ background: canvasItem.color }} title={canvasItem.colorName || 'Culoare'} />
      </div>
      <div className="pc-body">
        <h3 className="pc-name">{product.name}</h3>
        <p className="pc-store">{product.store}</p>
        <p className="pc-desc">{product.description}</p>
        <p className="pc-dims">
          {canvasItem.width}m × {canvasItem.depth}m × {canvasItem.height}m
        </p>
        <p className="pc-color-label">{canvasItem.colorName}</p>
      </div>
      <div className="pc-side">
        <span className="pc-price">
          {parseFloat(product.price).toLocaleString('ro-RO')} RON
        </span>
        <div className="pc-actions">
          <a
            className="btn-store"
            href={product.url}
            target="_blank"
            rel="noreferrer"
          >
            Vezi în Magazin
          </a>
          <button
            type="button"
            className={`btn-add-room ${added ? 'added' : ''}`}
            onClick={() => onAddToRoom(canvasItem)}
            disabled={added}
          >
            {added ? '✓ În cameră' : 'Adaugă în cameră'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function FurnitureChat() {
  const { room, selectedFurniture, addProductToRoom } = useStore()

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Salut! Spune-mi ce mobilier cauți — tip (canapea, pat, masă…), buget, stil sau context (ex. „pat scandinav pentru 2 persoane”). Caut în catalogul real din baza de date, cu pozele produselor.',
      products: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const query = input.trim()
    if (!query || loading) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text: query, products: [] }])
    setLoading(true)

    try {
      const data = await searchFurniture({ query, room })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.message,
          products: data.products || [],
          intent: data.intent,
        },
      ])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Nu am putut procesa cererea: ${err.message}. Verifică că ești autentificat și că serverul Django rulează.`,
          products: [],
        },
      ])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const roomCount = selectedFurniture.length

  return (
    <div className="furniture-chat">
      <h2 className="section-title">Căutare mobilier</h2>
      <p className="section-sub">
        Descrie-ne nevoile tale în limbaj natural — filtrăm catalogul după tip, stil, buget și dimensiuni.
      </p>

      {room?.length && room?.width && (
        <div className="room-dims-banner">
          Camera ta: {room.length}m × {room.width}m × {room.height || '—'}m înălțime — afișăm doar piese care încap.
        </div>
      )}

      {roomCount > 0 && (
        <div className="room-items-banner">
          {roomCount} {roomCount === 1 ? 'piesă adăugată' : 'piese adăugate'} în cameră — continuă la Layout pentru poziționare.
        </div>
      )}

      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role}`}>
              <div className="bubble-avatar">{msg.role === 'user' ? 'Tu' : 'AI'}</div>
              <div className="bubble-content">
                <p className="bubble-text">{msg.text}</p>
                {msg.products?.length > 0 && (
                  <div className="product-cards-grid">
                    {msg.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        added={selectedFurniture.includes(`db-${product.id}`)}
                        onAddToRoom={addProductToRoom}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant">
              <div className="bubble-avatar">AI</div>
              <div className="bubble-content typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-label">Filtrez catalogul...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder='Ex: „Am nevoie de o canapea modernă pe culori reci, ~2000 lei. Am pisică și living mic.”'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
            {loading ? '...' : 'Trimite'}
          </button>
        </form>
      </div>

      {error && <p className="chat-error">{error}</p>}

      {messages.length === 1 && (
        <div className="chat-suggestions">
          <span className="suggestions-label">Încearcă:</span>
          {[
            'Canapea ieftină, modernă',
            'Sub 1500 lei canapea gri',
            'Pat dublu — locuiesc cu soția, dormitor',
            'Ceva decorativ să înfrumusețez livingul',
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              className="suggestion-chip"
              onClick={() => setInput(hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
