import { ApiErrorCodes } from '@latitude-data/constants/errors'
import {
  LatitudeError,
  UnprocessableEntityError,
} from '@latitude-data/core/lib/errors'
import { getUnknownError } from '@latitude-data/core/lib/getUnknownError'
import { ChainError } from '@latitude-data/core/services/chains/ChainErrors/index'
import { captureException } from '$/common/sentry'
import { HTTPException } from 'hono/http-exception'

import HttpStatusCodes from '../common/httpStatusCodes'

function unprocessableExtraParameters(error: UnprocessableEntityError) {
  const isChainError = error instanceof ChainError
  if (!isChainError) return { name: error.name, errorCode: error.name }

  const base = { name: 'DocumentRunError', errorCode: error.errorCode }
  const runError = error.runError

  if (!runError) return base

  return {
    ...base,
    dbErrorRef: {
      entityUuid: runError.errorableUuid,
      entityType: runError.errorableType,
    },
  }
}

const errorHandlerMiddleware = (err: Error) => {
  if (process.env.NODE_ENV !== 'test') {
    const unknownError = getUnknownError(err)

    if (unknownError) {
      captureException(err)
    }
  }

  if (err instanceof HTTPException) {
    return Response.json(
      {
        name: ApiErrorCodes.HTTPException,
        errorCode: ApiErrorCodes.HTTPException,
        message: err.message,
        details: { cause: err.cause },
      },
      { status: err.status, headers: err.res?.headers },
    )
  } else if (err instanceof UnprocessableEntityError) {
    return Response.json(
      {
        ...unprocessableExtraParameters(err),
        message: err.message,
        details: err.details,
      },
      { status: err.statusCode },
    )
  } else if (err instanceof LatitudeError) {
    return Response.json(
      {
        name: err.name,
        errorCode: err.name,
        message: err.message,
        details: err.details,
      },
      { status: err.statusCode, headers: err.headers },
    )
  } else {
    return Response.json(
      {
        name: 'InternalServerError',
        errorCode: ApiErrorCodes.InternalServerError,
        message: err.message,
        details: { cause: err.cause },
      },
      { status: HttpStatusCodes.INTERNAL_SERVER_ERROR },
    )
  }
}

export default errorHandlerMiddleware
