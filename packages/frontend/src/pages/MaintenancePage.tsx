import { ShieldAlert, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

interface MaintenancePageProps {
  message?: string
}

export function MaintenancePage({ message }: MaintenancePageProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/10 max-w-md w-full flex flex-col items-center gap-6 shadow-2xl">
        <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Maintenance Mode</h1>
          <p className="text-zinc-400">
            {message || 'The system is currently undergoing maintenance. Please check back later.'}
          </p>
        </div>

        <div className="pt-4 border-t border-white/5 w-full">
           <Button variant="outline" className="w-full gap-2 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => navigate('/login')}>
             <LogIn className="w-4 h-4" />
             Login as Admin
           </Button>
        </div>
      </div>
    </div>
  )
}
