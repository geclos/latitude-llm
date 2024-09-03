import { and, eq, getTableColumns } from 'drizzle-orm'

import { memberships, users } from '../schema'
import Repository from './repository'

const tt = {
  ...getTableColumns(users),
  confirmedAt: memberships.confirmedAt,
}

export class UsersRepository extends Repository<typeof tt> {
  get scope() {
    return this.db
      .select(tt)
      .from(users)
      .innerJoin(
        memberships,
        and(
          eq(memberships.userId, users.id),
          eq(memberships.workspaceId, this.workspaceId),
        ),
      )
      .as('usersScope')
  }
}
