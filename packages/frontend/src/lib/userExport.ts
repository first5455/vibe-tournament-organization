import type { User } from '../types'

interface UserExportOptions {
  users: User[]
  pointDisplayName: string
  siteName: string
  filterGameId?: string
  gameName?: string
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function getMMR(user: User, filterGameId?: string): string | number {
  if (filterGameId && filterGameId !== 'all' && user.stats) {
    const stat = user.stats.find(s => s.gameId === parseInt(filterGameId))
    return stat?.mmr ?? '-'
  }
  return '-'
}

// ========================
// EXCEL EXPORT
// ========================
export async function exportUsersToExcel(options: UserExportOptions) {
  const { users, pointDisplayName, siteName, filterGameId, gameName } = options
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Header row
  const header = ['ID', 'Display Name', 'Username', 'Role', 'MMR', pointDisplayName, 'Joined']
  const data = users.map(u => [
    u.id,
    u.displayName || '-',
    u.username,
    u.assignedRole?.name || 'User',
    getMMR(u, filterGameId),
    u.points ?? 0,
    formatDate(u.createdAt),
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  ws['!cols'] = [
    { wch: 6 },   // ID
    { wch: 25 },  // Display Name
    { wch: 20 },  // Username
    { wch: 15 },  // Role
    { wch: 10 },  // MMR
    { wch: 12 },  // Points
    { wch: 18 },  // Joined
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Users')

  // Summary sheet
  const summaryData = [
    ['Exported From', siteName],
    ['Export Date', new Date().toLocaleString()],
    ['Total Users', users.length],
    ['Game Filter', gameName || 'All Games'],
    [`Total ${pointDisplayName}`, users.reduce((sum, u) => sum + (u.points ?? 0), 0)],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  XLSX.writeFile(wb, `${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_users_export.xlsx`)
}

// ========================
// PDF EXPORT
// ========================
export async function exportUsersToPDF(options: UserExportOptions) {
  const { users, pointDisplayName, siteName, filterGameId, gameName } = options
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text(`${siteName} - User Report`, 14, 20)

  // Subtitle info
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Exported: ${new Date().toLocaleString()} | Total Users: ${users.length}`, 14, 28)
  if (gameName) {
    doc.text(`Game: ${gameName}`, 14, 34)
  }

  // Summary stats
  const totalPoints = users.reduce((sum, u) => sum + (u.points ?? 0), 0)
  const summaryY = gameName ? 40 : 34
  doc.text(`Total ${pointDisplayName}: ${totalPoints}`, 14, summaryY)

  // Users table
  const tableStartY = summaryY + 10

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Display Name', 'Username', 'Role', 'MMR', pointDisplayName, 'Joined']],
    body: users.map((u, i) => [
      i + 1,
      u.displayName || '-',
      u.username,
      u.assignedRole?.name || 'User',
      getMMR(u, filterGameId),
      u.points ?? 0,
      formatDate(u.createdAt),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { cellWidth: 10 },  // #
      5: { halign: 'right' }, // Points
      4: { halign: 'right' }, // MMR
    },
  })

  doc.save(`${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_users_report.pdf`)
}
