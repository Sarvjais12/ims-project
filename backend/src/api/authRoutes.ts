import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()

const USERS: Record<string, string> = {
  admin: 'admin123'
}

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }

  if (USERS[username] !== password) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const secret = process.env.JWT_SECRET as string
  const token = jwt.sign({ username }, secret, { expiresIn: '24h' })

  res.json({ token, username, message: 'Login successful' })
})

export default router