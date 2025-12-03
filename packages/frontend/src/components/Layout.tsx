import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from './ui/button'
import { Trophy, Users, LogOut, LayoutDashboard } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:opacity-80 transition-opacity">
                <Trophy className="h-6 w-6 text-indigo-500" />
                <span>TourneyOrg</span>
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
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">
                    Signed in as <Link to="/profile" className="text-white font-medium hover:underline">{user.username}</Link>
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
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
