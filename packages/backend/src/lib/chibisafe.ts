// Chibisafe upload utility
export async function uploadToChibisafe(fileBuffer: Buffer, fileName: string): Promise<{ url: string, uuid: string | null }> {
  const chibisafeUrl = process.env.CHIBISAFE_URL
  const chibisafeApiKey = process.env.CHIBISAFE_API_KEY

  if (!chibisafeUrl || !chibisafeApiKey) {
    throw new Error('Chibisafe configuration missing. Please set CHIBISAFE_URL and CHIBISAFE_API_KEY environment variables.')
  }

  const formData = new FormData()
  const blob = new Blob([fileBuffer])
  formData.append('file', blob, fileName)

  const response = await fetch(`${chibisafeUrl}/api/upload`, {
    method: 'POST',
    headers: {
      'X-API-Key': chibisafeApiKey,
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Chibisafe upload failed: ${response.status} ${errorText}`)
  }

  const data = await response.json() as any
  
  // Chibisafe returns the file info with  a URL and UUID
  const uuid = data.uuid || data.file?.uuid
  const url = data.url || data.file?.url || `${chibisafeUrl}/${data.file?.name || data.name}`
  
  return { url, uuid }
}

// Delete image from chibisafe
export async function deleteFromChibisafe(chibisafeUuid: string | null | undefined): Promise<void> {
  const chibisafeUrl = process.env.CHIBISAFE_URL
  const chibisafeApiKey = process.env.CHIBISAFE_API_KEY

  if (!chibisafeUrl || !chibisafeApiKey) {
    console.warn('Chibisafe configuration missing. Skipping image deletion.')
    return
  }

  // Skip if no UUID provided
  if (!chibisafeUuid) {
    console.warn('No chibisafe UUID provided, skipping deletion')
    return
  }

  try {
    // Delete using UUID as per chibisafe API: DELETE /api/file/{uuid}
    const response = await fetch(`${chibisafeUrl}/api/file/${chibisafeUuid}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': chibisafeApiKey,
      }
    })

    if (!response.ok) {
      console.error(`Failed to delete image from chibisafe: ${response.status}`)
    }
  } catch (err) {
    console.error('Error deleting image from chibisafe:', err)
  }
}
