'use client'

import { ReactNode } from 'react'

import { EvaluationDto, ProviderApiKey } from '@latitude-data/core/browser'
import { Button, Icon } from '@latitude-data/web-ui'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { EvaluationTabSelector } from '../../_components/EvaluationTabs'
import EvaluationEditor from './EvaluationEditor/Editor'

interface EvaluationEditorLayoutProps {
  children: ReactNode
  evaluation: EvaluationDto
  providerApiKeys: ProviderApiKey[]
  evaluationUuid: string
  freeRunsCount: number | undefined
}

export default function EvaluationEditorLayout({
  children,
  evaluation,
  providerApiKeys,
  evaluationUuid,
  freeRunsCount,
}: EvaluationEditorLayoutProps) {
  const searchParams = useSearchParams()
  const backUrl = searchParams.get('back')

  return (
    <div className='h-full flex flex-col gap-y-4 p-6'>
      {backUrl && (
        <Link href={backUrl}>
          <Button variant='link'>
            <Icon name='arrowLeft' /> Back to the document
          </Button>
        </Link>
      )}
      <EvaluationTabSelector evaluation={evaluation} />
      <div className='flex-grow'>
        <EvaluationEditor
          providerApiKeys={providerApiKeys}
          evaluationUuid={evaluationUuid}
          defaultPrompt={evaluation.metadata.prompt}
          freeRunsCount={freeRunsCount ? Number(freeRunsCount) : undefined}
        />
      </div>
      {children}
    </div>
  )
}
