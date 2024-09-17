'use client'

import { useState } from 'react'

import type { User } from '@latitude-data/core/browser'
import {
  Button,
  Icon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@latitude-data/web-ui'
import { relativeTime } from '$/lib/relativeTime'
import { ROUTES } from '$/services/routes'
import useUsers from '$/stores/users'
import Link from 'next/link'

import NewUser from './New'

export default function Memberships() {
  const [open, setOpen] = useState(false)
  const { data: users } = useUsers()

  return (
    <div className='flex flex-col gap-4'>
      <NewUser open={open} setOpen={setOpen} />
      <div className='flex flex-row items-center justify-between'>
        <Text.H4B>Workspace Users</Text.H4B>
        <Button fancy variant='outline' onClick={() => setOpen(true)}>
          Add User
        </Button>
      </div>
      <div className='flex flex-col gap-2'>
        {users.length > 0 && <UsersTable users={users} />}
      </div>
    </div>
  )
}

function UsersTable({ users }: { users: User[] }) {
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
                {relativeTime(user.confirmedAt)}
              </Text.H4>
            </TableCell>
            <TableCell>
              <Link href={ROUTES.settings.users.destroy(user.id).root}>
                <Icon name='trash' />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
