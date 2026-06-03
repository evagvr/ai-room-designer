import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import './AuthPages.css'

export function LoginPage() {
    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [error, setError] = useState('')
    const { login } = useStore()
    const navigate = useNavigate()

    const handleLogin = async () => {
    try {
      await login(email, pass)  
      navigate('/designer')
    } catch (err) {
      setError(err.message)
    }
  }

    return (
        <div className="auth-page">
        <div className="auth-card card">
            <h2>Autentificare</h2>
            <p className="auth-sub">Intră în contul tău pentru a accesa proiectele salvate.</p>
            {error && <div className="warn-box">{error}</div>}
            <div className="field-group">
            <label className="label">Email</label>
            <input className="input-field" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="exemplu@mail.com" />
            </div>
            <div className="field-group">
            <label className="label">Parolă</label>
            <input className="input-field" type="password" value={pass}
                onChange={e => setPass(e.target.value)} placeholder="Minim 8 caractere"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={handleLogin}>
            Autentifică-te
            </button>
            <p className="auth-link">Nu ai cont? <Link to="/register">Înregistrează-te</Link></p>
        </div>
        </div>
    )
}

export function RegisterPage() {
    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [error, setError] = useState('')
    const { register } = useStore()
    const navigate = useNavigate()

    const handleRegister = async () => {
    try {
      await register(email, pass)   
      navigate('/designer')
    } catch (err) {
      setError(err.message)
    }
  }

    return (
        <div className="auth-page">
        <div className="auth-card card">
            <h2>Cont nou</h2>
            <p className="auth-sub">Creează-ți contul pentru a salva proiectele de design.</p>
            {error && <div className="warn-box">{error}</div>}
            <div className="field-group">
            <label className="label">Email</label>
            <input className="input-field" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="exemplu@mail.com" />
            </div>
            <div className="field-group">
            <label className="label">Parolă (minim 8 caractere)</label>
            <input className="input-field" type="password" value={pass}
                onChange={e => setPass(e.target.value)} placeholder="Alegeți o parolă sigură"
                onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </div>
            <button className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={handleRegister}>
            Creează cont
            </button>
            <p className="auth-link">Ai deja cont? <Link to="/login">Autentifică-te</Link></p>
        </div>
        </div>
    )
}

export default LoginPage