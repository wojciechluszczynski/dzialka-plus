// No server-side data fetch — InboxView fetches client-side for instant skeleton render
import InboxView from './InboxView'

export default function InboxPage({
  params,
  searchParams,
}: {
  params: { workspaceId: string }
  searchParams: { add?: string; url?: string; text?: string }
}) {
  return (
    <InboxView
      workspaceId={params.workspaceId}
      initialShowAdd={searchParams.add === '1'}
      initialUrl={searchParams.url ?? ''}
      initialText={searchParams.text ?? ''}
    />
  )
}
