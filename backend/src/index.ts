import express from 'express'
import dotenv from 'dotenv'
import { connectPostgres } from './storage/postgres'
import { connectMongo } from './storage/mongo'
import { connectRedis } from './storage/redis'
import { initSchema } from './storage/schema'
import { RingBuffer } from './ingestion/RingBuffer'
import { DebounceEngine } from './ingestion/DebounceEngine'
import { SignalProcessor } from './ingestion/SignalProcessor'
import { createWorkItem, linkSignal } from './storage/workItemStore'

dotenv.config()

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})
import incidentRoutes from './api/incidentRoutes'
import { pgPool } from './storage/postgres'
import { redisClient } from './storage/redis'
import mongoose from 'mongoose'

// Boot these up globally so routes can use them
export const ringBuffer = new RingBuffer(50000)

async function start() {
  await connectPostgres()
  await connectMongo()
  await connectRedis()
  await initSchema()

  const debounce = new DebounceEngine(createWorkItem, linkSignal)
  const processor = new SignalProcessor(ringBuffer, debounce)
  processor.start()

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      bufferSize: ringBuffer.length
    })
  })

  // Raw ingestion endpoint
  app.post('/api/signals', (req, res) => {
    const { componentId, componentType, message } = req.body

    if (!componentId || !componentType || !message) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const pushed = ringBuffer.push({
      componentId,
      componentType,
      message,
      timestamp: new Date()
    })

    if (!pushed) {
      return res.status(429).json({ error: 'Buffer full — try again' })
    }

    return res.status(202).json({ accepted: true })
  })
app.use('/api/incidents', incidentRoutes)

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