import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { GameProvider, useGame } from './contexts/GameContext'
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
import GameSelectPage from './pages/GameSelectPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const { selectedGame, isLoading: gameLoading } = useGame()
  const location = useLocation()
  
  if (authLoading || gameLoading) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>
  
  if (!user) return <Navigate to="/login" />

  // If logged in, but no game selected, and not already on selection page, redirect.
  // Note: We might want to allow some admin pages without game selection? For now strict.
  if (!selectedGame && location.pathname !== '/select-game') {
      return <Navigate to="/select-game" />
  }

  // If game IS selected, and we try to go to select-game, maybe allow it (to switch) or redirect home?
  // Usually we allow it so they can switch. But if they are just navigating, maybe leave it.
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hasPermission } = useAuth()
  
  if (isLoading) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>
  if (!user || !hasPermission('admin.access')) return <Navigate to="/" />
  
  return <>{children}</>
}

import { useEffect, useState } from 'react'
import { api } from './lib/api'
import { MaintenancePage } from './pages/MaintenancePage'

function AppContent() {
  const { user, isLoading, hasPermission } = useAuth()
  const [maintenance, setMaintenance] = useState<{ enabled: boolean, message: string } | null>(null)
  const [checkingMaintenance, setCheckingMaintenance] = useState(true)
  const location = useLocation()

  const checkMaintenance = async () => {
      try {
          const data = await api('/settings')
          setMaintenance({ 
            enabled: data.maintenanceMode, 
            message: data.maintenanceMessage 
          })
      } catch (err) {
          console.error("Failed to fetch settings", err)
      } finally {
          setCheckingMaintenance(false)
      }
  }

  useEffect(() => {
    checkMaintenance()
  }, [location.pathname]) // Check on mount and navigation only

  if (isLoading || checkingMaintenance) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>

  // Maintenance Check
  if (maintenance?.enabled && !hasPermission('admin.access')) {
      return <MaintenancePage message={maintenance.message} />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/select-game" element={
          <ProtectedRoute>
            <GameSelectPage />
          </ProtectedRoute>
        } />

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
  )
}

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
           <AppContent />
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  )
}

export default App
