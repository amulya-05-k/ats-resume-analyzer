import { motion } from 'framer-motion';
import { ClipboardList, FileSearch2, History, Sparkles, User } from 'lucide-react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: FileSearch2 },
  { to: '/history', label: 'History', icon: History },
];

export default function Layout() {
  function UserPanel() {
    const { user, logout } = useAuth();
    if (!user) {
      return (
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm text-slate-200 hover:text-white">Sign in</Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <img src={user.avatar || `https://avatars.dicebear.com/api/initials/${encodeURIComponent(user.name || user.email)}.svg`} alt="avatar" className="h-8 w-8 rounded-full" />
        <div className="hidden sm:block">
          <div className="text-sm font-medium">{user.name || user.email}</div>
          <button onClick={() => logout()} className="text-xs text-muted">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(247,183,49,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_28%),linear-gradient(180deg,_#06101d_0%,_#081424_52%,_#060b14_100%)] text-slate-100">
      <div className="fixed inset-0 -z-10 opacity-70">
        <div className="absolute left-10 top-16 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl animate-float" />
        <div className="absolute right-10 top-28 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl animate-float" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="sticky top-4 z-30 mb-6 rounded-[30px] border border-white/10 bg-slate-950/40 px-4 py-4 shadow-[0_20px_70px_rgba(2,6,23,0.55)] backdrop-blur-2xl sm:px-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-gold-400 text-ink-950 shadow-[0_0_30px_rgba(45,212,191,0.35)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.45em] text-teal-200/80">AI Resume Analyzer</p>
                <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">Semantic ATS scoring, skill detection, and history tracking</h1>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300',
                      isActive
                        ? 'border-teal-300/40 bg-teal-400/15 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,0.12)]'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {/* Show user avatar when logged in */}
              <UserPanel />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-teal-300" />
              PDF and DOCX support
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">spaCy + Sentence Transformers</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">MongoDB history</span>
          </div>
        </motion.header>

        <main className="flex-1 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
