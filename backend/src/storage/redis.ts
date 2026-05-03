import { createClient } from 'redis'
import dotenv from 'dotenv'
dotenv.config()

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  }
})

export async function connectRedis() {
  await redisClient.connect()
  console.log('Redis connected')
}