import { env } from '@latitude-data/env'
import { type Transporter, type TransportOptions } from 'nodemailer'
import HTMLToText from 'nodemailer-html-to-text'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

import createMailpitTransport from './mailpit'
import createPlunkTransport from './plunk'

const htmlToText = HTMLToText.htmlToText

export type MailerOptions = {
  transportOptions: TransportOptions
}

export type AdapterResult = {
  messageId: string
  status?: number
  message?: string
}

type MaybeTransport = Transporter<SMTPTransport.SentMessageInfo> | null

function createAdapter() {
  const options = {
    transportOptions: { component: 'latitude_mailer' },
  }

  const isPro = env.NODE_ENV === 'production'

  const transport: MaybeTransport = isPro
    ? createPlunkTransport(options)
    : createMailpitTransport(options)

  if (!transport) throw new Error('Could not create transport')

  // Middleware to convert HTML to text
  transport.use('compile', htmlToText())

  return transport
}

const adapter = createAdapter()

export default adapter