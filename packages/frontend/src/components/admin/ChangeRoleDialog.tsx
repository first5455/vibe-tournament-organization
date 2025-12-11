
import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { User } from '../../types'
import { useAuth } from '../../lib/auth'

interface ChangeRoleDialogProps {
    isOpen: boolean
    onClose: () => void
    user: User | null
    onSuccess: () => void
}

export function ChangeRoleDialog({ isOpen, onClose, user, onSuccess }: ChangeRoleDialogProps) {
    const { user: currentUser } = useAuth()
    const [roles, setRoles] = useState<{ id: number, name: string }[]>([])
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadRoles()
            if (user?.assignedRole) {
                setSelectedRoleId(user.assignedRole.id)
                // Legacy handling removed
            }
        }
    }, [isOpen, user])

    const loadRoles = async () => {
        try {
            const data = await api('/roles')
            setRoles(data)
        } catch (e) {
            console.error(e)
        }
    }

    const handleSave = async () => {
        if (!user || !selectedRoleId || !currentUser) return
        setLoading(true)
        try {
            await api(`/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    requesterId: currentUser.id,
                    roleId: selectedRoleId
                })
            })
            setLoading(false)
            onSuccess()
            onClose()
        } catch (e: any) {
            alert(e.message)
            setLoading(false)
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                    <DialogTitle>Change Role for {user?.username}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Select Role</label>
                    <div className="space-y-2">
                        {roles.map(role => (
                            <div 
                                key={role.id}
                                className={`p-3 rounded border cursor-pointer flex justify-between items-center ${selectedRoleId === role.id ? 'bg-indigo-900/30 border-indigo-500' : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-800/80'}`}
                                onClick={() => setSelectedRoleId(role.id)}
                            >
                                <span className="font-medium">{role.name}</span>
                                {selectedRoleId === role.id && <span className="text-indigo-400">Selected</span>}
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading || !selectedRoleId}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
