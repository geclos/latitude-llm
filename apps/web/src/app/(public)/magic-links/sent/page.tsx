import { FocusHeader } from '@latitude-data/web-ui'
import { FocusLayout } from '$/components/layouts'
import { ROUTES } from '$/services/routes'
import { redirect } from 'next/navigation'

export default function MagicLinkSent({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const { email } = searchParams
  if (!email) return redirect(ROUTES.root)

  return (
    <FocusLayout
      header={
        <FocusHeader
          title="You've got mail!"
          description={`We sent you a magic link to ${email}. Click the link to sign in.`}
        />
      }
    />
  )
}
