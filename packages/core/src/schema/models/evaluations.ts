import {
  bigint,
  bigserial,
  index,
  jsonb,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { EvaluationMetadataType } from '../../constants'
import { latitudeSchema } from '../db-schema'
import { workspaces } from '../models/workspaces'
import { timestamps } from '../schemaHelpers'
import { EvaluationResultConfiguration } from '../types'

export const metadataTypesEnum = latitudeSchema.enum('metadata_type', [
  EvaluationMetadataType.LlmAsJudge,
])

export const evaluations = latitudeSchema.table(
  'evaluations',
  {
    id: bigserial('id', { mode: 'number' }).notNull().primaryKey(),
    uuid: uuid('uuid').notNull().unique().defaultRandom(),
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description').notNull(),
    metadataId: bigint('metadata_id', { mode: 'number' }).notNull(),
    configuration: jsonb('configuration')
      .notNull()
      .$type<EvaluationResultConfiguration>(),
    metadataType: metadataTypesEnum('metadata_type').notNull(),
    workspaceId: bigint('workspace_id', { mode: 'number' })
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    ...timestamps(),
  },
  (table) => ({
    evaluationWorkspaceIdx: index('evaluation_workspace_idx').on(
      table.workspaceId,
    ),
    evaluationMetadataIdx: index('evaluation_metadata_idx').on(
      table.metadataId,
      table.metadataType,
    ),
  }),
)
