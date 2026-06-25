import { Router, Request, Response } from 'express'
import { PLAYERS as MOCK_PLAYERS, PLAYER_TAG } from '../data/mock.js'
import { parsePlayersEnv } from '../services/players.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const players = parsePlayersEnv()
  if (players.length > 0) {
    res.json(players)
    return
  }
  // Fallback to hardcoded mock players
  res.json(MOCK_PLAYERS.map(name => ({ name, tag: PLAYER_TAG[name as keyof typeof PLAYER_TAG] })))
})

export default router
