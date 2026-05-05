import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-blue-700 text-white'
          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <DocumentTextIcon className="h-7 w-7" />
            ATS Analyzer
          </Link>

          {/* Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {navLink('/analyzer', 'Analyzer')}
                {navLink('/dashboard', 'Dashboard')}
                <span className="text-blue-200 text-sm ml-2">Hi, {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {navLink('/login', 'Login')}
                {navLink('/register', 'Register')}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
