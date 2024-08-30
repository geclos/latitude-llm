'use client'

import { useState } from 'react'

import type { SafeUser } from '@latitude-data/core/browser'
import {
  Button,
  Icons,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@latitude-data/web-ui'
import useUsers from '$/stores/users'

import NewUser from './New'

export default function Memberships() {
  const [open, setOpen] = useState(false)
  const { data: users, destroy } = useUsers()

  return (
    <div className='flex flex-col gap-4'>
      <NewUser open={open} setOpen={setOpen} />
      <div className='flex flex-row items-center justify-between'>
        <Text.H4B>Workspace Users</Text.H4B>
        <Button variant='outline' onClick={() => setOpen(true)}>
          Add User
        </Button>
      </div>
      <div className='flex flex-col gap-2'>
        {users.length > 0 && <UsersTable users={users} destroy={destroy} />}
      </div>
    </div>
  )
}

function UsersTable({
  users,
  destroy,
}: {
  users: SafeUser[]
  destroy: Function
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow verticalPadding>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Confirmed At</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} verticalPadding>
            <TableCell>
              <Text.H4>{user.name}</Text.H4>
            </TableCell>
            <TableCell>
              <Text.H4 color='foregroundMuted'>{user.email}</Text.H4>
            </TableCell>
            <TableCell>
              <Text.H4 color='foregroundMuted'>
                {user.confirmedAt?.toISOString() || '-'}
              </Text.H4>
            </TableCell>
            <TableCell>
              <Button
                size='small'
                variant='linkDestructive'
                onClick={() => destroy({ userId: user.id })}
              >
                <Icons.trash />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
