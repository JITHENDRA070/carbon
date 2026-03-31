import { useMineAuth } from '../context/MineAuthContext'
import './Navbar.css'
import { FaHammer } from "react-icons/fa";

export default function Navbar() {
  const auth    = useMineAuth()
  const mineId  = auth?.mineId  ?? null
  const signOut = auth?.signOut ?? null

  return (
    <header className="nav">
      <div className="nav__inner">

        
        <div className="nav__brand">
          <span className="nav__brand-icon"><FaHammer /></span>
          <span>IndianCoal™ Zero</span>
        </div>

        
        <div className="nav__auth">
          {mineId ? (
            
            <>
              <div className="nav__mine-badge">
                <span className="nav__mine-dot" aria-hidden="true" />
                <span className="nav__mine-id">
                  <span className="nav__mine-label">MINE</span>
                  {mineId}
                </span>
              </div>
              <button
                id="nav-signout-btn"
                className="nav__btn nav__btn--signout"
                onClick={signOut}
                title="Sign out of your mine account"
              >
                Sign Out
              </button>
            </>
          ) : (
            
            <>
              <span className="nav__guest-label">Not signed in</span>
              <span className="nav__badge-guest">Sign in below ↓</span>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
