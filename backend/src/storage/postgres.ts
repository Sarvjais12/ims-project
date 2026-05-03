import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
})

export async function connectPostgres() {
  const client = await pgPool.connect()
  console.log('PostgreSQL connected')
  client.release()
}