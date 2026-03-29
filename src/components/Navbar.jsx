import { Link, NavLink } from 'react-router-dom'
import './Navbar.css'

const linkClass = ({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`

export default function Navbar() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand">
          Coal carbon footprint
        </Link>
        <nav className="nav__links" aria-label="Main">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/activity/create" className={linkClass}>
            Create
          </NavLink>
          <NavLink to="/activity/update" className={linkClass}>
            Update
          </NavLink>
          <NavLink to="/emissions" className={linkClass}>
            Emissions
          </NavLink>
          <NavLink to="/pathways" className={linkClass}>
            Pathways
          </NavLink>
          <NavLink to="/insights" className={linkClass}>
            Insights
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Mine setup
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
