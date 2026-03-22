import { redirect } from 'next/navigation'

// /add redirects to /inbox?add=1 which auto-opens the Add dialog
export default function AddPage({ params }: { params: { workspaceId: string } }) {
  redirect(`/app/workspace/${params.workspaceId}/inbox?add=1`)
}
