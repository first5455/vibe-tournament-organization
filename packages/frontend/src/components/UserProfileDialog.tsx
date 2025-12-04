import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { useEffect, useState } from "react"
import { getUserHistory } from "../lib/api"
import { Trophy, Calendar, Users, Hash, FileText } from "lucide-react"

interface HistoryItem {
  tournamentName: string
  tournamentDate: string
  status: string
  score: number
  rank: number
  totalParticipants: number
  note: string | null
}

interface UserProfileDialogProps {
  userId: number
  username: string
  children: React.ReactNode
}

export function UserProfileDialog({ userId, username, children }: UserProfileDialogProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      getUserHistory(userId)
        .then((data) => setHistory(data.history))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, userId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:opacity-80 transition-opacity">
            {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {username}'s Tournament History
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tournament history found.</div>
          ) : (
            <div className="grid gap-4">
              {history.map((item, i) => (
                <div key={i} className="bg-secondary/20 rounded-lg p-4 border border-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      {item.tournamentName}
                    </h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.tournamentDate ? `Started: ${new Date(item.tournamentDate).toLocaleDateString(undefined, { dateStyle: 'long' })}` : 'No date'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Rank</span>
                      <span className="font-medium flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {item.rank} / {item.totalParticipants}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Score</span>
                      <span className="font-medium">{item.score} pts</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs">Status</span>
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </div>

                  {item.note && (
                    <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground flex items-start gap-2">
                      <FileText className="w-3 h-3 mt-1 shrink-0" />
                      <p>{item.note}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
