import Paths from '$src/common/Paths'
import { Router } from 'express'

import commitsRouter from './commits'

const router = Router()

router.use(Paths.Api.V1.Commits.Base, commitsRouter)

export default router
