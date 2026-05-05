import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import './Layout.css'

export default function Layout() {
  const { isAuthenticated, user, logout } = useStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-icon">◆</span>
          <span className="nav-brand-text">Atelier AI</span>
        </Link>
        <div className="nav-links">
          <Link to="/designer" className={`nav-link ${isActive('/designer') ? 'active' : ''}`}>
            Designer
          </Link>
          <Link to="/compare" className={`nav-link ${isActive('/compare') ? 'active' : ''}`}>
            Comparare
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                Camerele mele
              </Link>
              <span className="nav-user">{user?.email?.split('@')[0]}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Ieșire</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Autentificare</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Cont nou</Link>
            </>
          )}
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
