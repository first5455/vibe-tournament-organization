import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Trophy, Users, LogOut, LayoutDashboard, Menu, X, Shield } from 'lucide-react'
import { UserLabel } from './UserLabel'
import { UserAvatar } from './UserAvatar'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:opacity-80 transition-opacity">
                <Trophy className="h-6 w-6 text-indigo-500" />
                <span>VibeTourney</span>
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
                  <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                  <span className="text-sm text-zinc-400 flex items-center gap-1">
                    Signed in as <Link to="/profile" className="text-white font-medium hover:underline"><UserLabel username={user.username} color={user.color} /></Link>
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
                    <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                    <div className="text-sm text-zinc-400 flex items-center gap-1">
                      Signed in as <Link to="/profile" className="text-white font-medium hover:underline" onClick={() => setIsMenuOpen(false)}><UserLabel username={user.username} color={user.color} /></Link>
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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
