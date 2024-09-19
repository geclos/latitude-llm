import { useEffect, useState } from 'react'

import { ConversationMetadata, readMetadata } from '@latitude-data/compiler'

type Props = Parameters<typeof readMetadata>[0]
export function useMetadata(props: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [metadata, setMetadata] = useState<ConversationMetadata>()
  useEffect(() => {
    setIsLoading(true)
    readMetadata(props).then((m) => {
      setMetadata(m)
      setIsLoading(false)
    })
  }, [props])

  return { metadata, isLoading }
}