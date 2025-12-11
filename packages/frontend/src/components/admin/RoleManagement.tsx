
import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Button } from '../ui/button'
import { Plus, Edit2, Trash2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'

interface Permission {
    id: number
    slug: string
    description: string
}

interface Role {
    id: number
    name: string
    description?: string
    isSystem: boolean
    permissions?: Permission[]
}

import { useAuth } from '../../lib/auth'

export function RoleManagement() {
    const { user, hasPermission } = useAuth()
    const [roles, setRoles] = useState<Role[]>([])
    const [allPermissions, setAllPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<Role | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissionIds: [] as number[]
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [rolesData, permsData] = await Promise.all([
                api('/roles'),
                api('/permissions')
            ])
            
            // For each role, we might need to fetch its permissions if not included in list
            // The list endpoint might not include permissions by default, but let's check backend implementation
            // My backend /roles endpoint returns basic info. /roles/:id returns permissions.
            // I should either update backend list to include permissions or fetch details.
            // Let's iterate and fetch details or lazy load. For < 20 roles, fetching all details is fine.
            
            const rolesWithPerms = await Promise.all(rolesData.map(async (r: Role) => {
                const details = await api(`/roles/${r.id}`)
                return details
            }))

            setRoles(rolesWithPerms)
            setAllPermissions(permsData)
        } catch (error) {
            console.error('Failed to load roles', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingRole(null)
        setFormData({ name: '', description: '', permissionIds: [] })
        setIsDialogOpen(true)
    }

    const handleEdit = (role: Role) => {
        setEditingRole(role)
        setFormData({
            name: role.name,
            description: role.description || '',
            permissionIds: role.permissions?.map(p => p.id) || []
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this role?')) return
        try {
            await api(`/roles/${id}`, { 
                method: 'DELETE',
                body: JSON.stringify({ requesterId: user?.id })
            })
            loadData()
        } catch (error: any) {
            alert(error.message)
        }
    }

    const handleSave = async () => {
        try {
            let roleId = editingRole?.id
            
            if (editingRole) {
                await api(`/roles/${editingRole.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formData.name,
                        description: formData.description,
                        requesterId: user?.id
                    })
                })
            } else {
                const newRole = await api('/roles', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: formData.name,
                        description: formData.description,
                        requesterId: user?.id
                    })
                })
                roleId = newRole.id
            }

            // Update permissions
            if (roleId) {
                await api(`/roles/${roleId}/permissions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        permissionIds: formData.permissionIds,
                        requesterId: user?.id
                    })
                })
            }

            setIsDialogOpen(false)
            loadData()
        } catch (error: any) {
            alert(error.message)
        }
    }

    const togglePermission = (id: number) => {
        setFormData(prev => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(id)
                ? prev.permissionIds.filter(pid => pid !== id)
                : [...prev.permissionIds, id]
        }))
    }

    if (loading) return <div>Loading roles...</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Role Management</h2>
                {(hasPermission('roles.manage')) && (
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Create Role
                    </Button>
                )}
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {roles.map(role => (
                    <div key={role.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    {role.name}
                                    {role.isSystem && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">System</span>}
                                </h3>
                                <p className="text-sm text-zinc-400">{role.description || 'No description'}</p>
                            </div>
                            <div className="flex gap-1">
                                {(hasPermission('roles.manage')) && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(role)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                )}
                                {!role.isSystem && (hasPermission('roles.manage')) && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleDelete(role.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Permissions</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {role.permissions?.length ? (
                                    role.permissions.map(p => (
                                        <span key={p.id} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded" title={p.description}>
                                            {p.slug}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-zinc-600 italic">No permissions assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 text-white border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role Name</label>
                            <input 
                                className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-white"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                            {editingRole?.isSystem && <p className="text-xs text-blue-400">Note: Changing a system role name may affect automated seeding.</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <input 
                                className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-white"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Permissions</label>
                            <div className="border border-zinc-700 rounded-md p-2 max-h-60 overflow-y-auto space-y-1">
                                {allPermissions.map(perm => (
                                    <div key={perm.id} className="flex items-start gap-2 p-1 hover:bg-zinc-800 rounded cursor-pointer" onClick={() => togglePermission(perm.id)}>
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${formData.permissionIds.includes(perm.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-500'}`}>
                                            {formData.permissionIds.includes(perm.id) && <span className="text-white text-[10px]">✓</span>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{perm.slug}</div>
                                            <div className="text-xs text-zinc-400">{perm.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.name}>
                            <Save className="mr-2 h-4 w-4" /> Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
