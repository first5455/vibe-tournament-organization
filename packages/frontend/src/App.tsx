import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import TournamentView from './pages/TournamentView'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import UserProfilePage from './pages/UserProfilePage'
import AdminPortal from './pages/AdminPortal'
import DuelDashboard from './pages/DuelDashboard'
import DuelRoom from './pages/DuelRoom'
import DecksPage from './pages/DecksPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>
  if (!user) return <Navigate to="/login" />
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>
  if (!user || user.role !== 'admin') return <Navigate to="/" />
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentView />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/users/:id" element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/decks" element={
              <ProtectedRoute>
                <DecksPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPortal />
              </AdminRoute>
            } />
            <Route path="/duels" element={
              <ProtectedRoute>
                <DuelDashboard />
              </ProtectedRoute>
            } />
            <Route path="/duels/:id" element={
              <ProtectedRoute>
                <DuelRoom />
              </ProtectedRoute>
            } />
            
            {/* Add other protected routes here */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
