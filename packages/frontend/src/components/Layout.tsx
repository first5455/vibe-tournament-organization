import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Trophy, Users, LogOut, LayoutDashboard, Menu, X, Shield, Swords } from 'lucide-react'
import { UserLabel } from './UserLabel'
import { UserAvatar } from './UserAvatar'
import pkg from '../../package.json'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      <nav className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Trophy className="h-8 w-8 text-indigo-500" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white leading-none">VibeTourney</span>
                  <span className="text-[10px] text-zinc-500 font-mono">v{pkg.version}</span>
                </div>
              </Link>
              
              {user && (
                <div className="hidden md:flex items-center gap-1">
                  <Link to="/">
                    <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} size="sm">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/leaderboard">
                    <Button variant={location.pathname === '/leaderboard' ? 'secondary' : 'ghost'} size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Leaderboard
                    </Button>
                  </Link>
                  <Link to="/duels">
                    <Button variant={location.pathname === '/duels' ? 'secondary' : 'ghost'} size="sm">
                      <Swords className="mr-2 h-4 w-4" />
                      Duel Room
                    </Button>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin">
                      <Button variant={location.pathname === '/admin' ? 'secondary' : 'ghost'} size="sm">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <Link to={`/users/${user.id}`}>
                    <UserAvatar username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                  </Link>
                  <span className="text-sm text-zinc-400 flex items-center gap-1">
                    Signed in as <Link to={`/users/${user.id}`} className="text-white font-medium hover:underline"><UserLabel username={user.username} displayName={user.displayName} color={user.color} /></Link>
                  </span>
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Sign in</Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-zinc-900">
            <div className="space-y-1 px-4 pb-3 pt-2">
              {user && (
                <>
                  <Link to="/" onClick={() => setIsMenuOpen(false)}>
                    <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/leaderboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant={location.pathname === '/leaderboard' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Leaderboard
                    </Button>
                  </Link>
                  <Link to="/duels" onClick={() => setIsMenuOpen(false)}>
                    <Button variant={location.pathname === '/duels' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <Swords className="mr-2 h-4 w-4" />
                      Duel Room
                    </Button>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button variant={location.pathname === '/admin' ? 'secondary' : 'ghost'} className="w-full justify-start">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <div className="my-2 border-t border-white/10" />
                  <div className="px-2 py-2 flex items-center gap-3">
                    <Link to={`/users/${user.id}`} onClick={() => setIsMenuOpen(false)}>
                      <UserAvatar username={user.username} displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                    </Link>
                    <div className="text-sm text-zinc-400 flex items-center gap-1">
                      Signed in as <Link to={`/users/${user.id}`} className="text-white font-medium hover:underline" onClick={() => setIsMenuOpen(false)}><UserLabel username={user.username} displayName={user.displayName} color={user.color} /></Link>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { logout(); setIsMenuOpen(false) }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </>
              )}
              {!user && (
                <div className="flex flex-col gap-2 p-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Sign in</Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="primary" className="w-full justify-start">Sign up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-zinc-900/50 backdrop-blur-xl py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 text-sm">
          <p>© 2024 VibeTourney. Open Source under <a href="http://www.wtfpl.net/" target="_blank" rel="noreferrer" className="underline hover:text-white">WTFPL</a> License.</p>
          <a 
            href="https://github.com/first5455/vibe-tournament-organization" 
            target="_blank" 
            rel="noreferrer" 
            className="hover:text-white transition-colors flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>first5455/vibe-tournament-organization</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
