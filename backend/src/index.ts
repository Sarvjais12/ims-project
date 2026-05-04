import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

import { connectPostgres } from './storage/postgres'
import { connectMongo } from './storage/mongo'
import { connectRedis } from './storage/redis'
import { initSchema } from './storage/schema'
import { pgPool } from './storage/postgres'
import { redisClient } from './storage/redis'

import { RingBuffer } from './ingestion/RingBuffer'
import { DebounceEngine } from './ingestion/DebounceEngine'
import { SignalProcessor } from './ingestion/SignalProcessor'
import { createWorkItem, linkSignal } from './storage/workItemStore'

import authRoutes from './api/authRoutes'
import incidentRoutes from './api/incidentRoutes'
import { authenticateToken } from './api/authMiddleware'

dotenv.config()

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.sendStatus(200); return }
  next()
})

export const ringBuffer = new RingBuffer(50000)

async function start() {
  await connectPostgres()
  await connectMongo()
  await connectRedis()
  await initSchema()

  const debounce = new DebounceEngine(createWorkItem, linkSignal)
  const processor = new SignalProcessor(ringBuffer, debounce)
  processor.start()

  // Public routes
  app.use('/api/auth', authRoutes)

  // Protected routes
  app.use('/api/incidents', authenticateToken, incidentRoutes)

  // Login — directly in index.ts, no separate file needed
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (username === 'admin' && password === 'admin123') {
    const token = require('jsonwebtoken').sign(
      { username },
      process.env.JWT_SECRET || 'ims_secret',
      { expiresIn: '24h' }
    )
    res.json({ token, username, message: 'Login successful' })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})

  app.post('/api/signals', authenticateToken, (req, res) => {
    const { componentId, componentType, message } = req.body
    if (!componentId || !componentType || !message) {
      return res.status(400).json({ error: 'Missing fields' })
    }
    const pushed = ringBuffer.push({
      componentId, componentType, message, timestamp: new Date()
    })
    if (!pushed) return res.status(429).json({ error: 'Buffer full — try again' })
    return res.status(202).json({ accepted: true })
  })

  app.get('/health', async (req, res) => {
    try {
      await pgPool.query('SELECT 1')
      await redisClient.ping()
      const mongoOk = mongoose.connection.readyState === 1
      res.json({
        status: 'ok',
        postgres: 'ok',
        redis: 'ok',
        mongo: mongoOk ? 'ok' : 'degraded',
        bufferSize: ringBuffer.length
      })
    } catch (err: any) {
      res.status(503).json({ status: 'degraded', error: err.message })
    }
  })

  app.listen(process.env.PORT, () => {
    console.log(`Server on port ${process.env.PORT}`)
  })
}

start()