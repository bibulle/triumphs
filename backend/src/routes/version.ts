import { Router, Request, Response } from 'express'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json({ version })
})

export default router
