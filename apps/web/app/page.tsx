import { redirect } from 'next/navigation'

// Root redirects to /app (middleware handles auth)
export default function RootPage() {
  redirect('/app')
}
