import { pgPool } from '../storage/postgres'
import { redisClient } from '../storage/redis'
import { SignalModel } from '../storage/SignalModel'
import { getState, WorkItemStatus } from './states'

export class WorkItemService {

  async getAll() {
    const result = await pgPool.query(
      `SELECT * FROM work_items ORDER BY 
        CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 END,
        created_at DESC`
    )
    return result.rows
  }

  async getById(id: string) {
    const result = await pgPool.query(
      'SELECT * FROM work_items WHERE id = $1',
      [id]
    )
    if (result.rows.length === 0) throw new Error('Work item not found')

    // Get raw signals from Mongo
    const signals = await SignalModel.find({ workItemId: id }).sort({ timestamp: 1 })

    return { ...result.rows[0], signals }
  }

  async transition(id: string, targetStatus: WorkItemStatus) {
    const result = await pgPool.query(
      'SELECT * FROM work_items WHERE id = $1',
      [id]
    )
    if (result.rows.length === 0) throw new Error('Work item not found')

    const item = result.rows[0]
    const currentState = getState(item.status)

    // Check valid next state
    const validNext = currentState.next()
    if (targetStatus !== validNext) {
      throw new Error(`Invalid transition: ${item.status} → ${targetStatus}. Expected: ${validNext}`)
    }

    // If closing, check RCA exists
    if (targetStatus === 'CLOSED') {
      const rca = await pgPool.query(
        'SELECT id FROM rca_records WHERE work_item_id = $1',
        [id]
      )
      if (rca.rows.length === 0) {
        throw new Error('Cannot close without RCA. Submit RCA first.')
      }
    }

    // Transactional update
    await pgPool.query(
      'UPDATE work_items SET status = $1 WHERE id = $2',
      [targetStatus, id]
    )

    // Invalidate Redis cache
    await redisClient.del(`workitem:${id}`)
    await redisClient.del('dashboard:incidents')

    return { id, status: targetStatus }
  }

  async submitRca(id: string, rca: {
    rootCauseCategory: string
    fixApplied: string
    preventionSteps: string
    incidentStart: string
    incidentEnd: string
  }) {
    // Validate all fields present
    const required = ['rootCauseCategory', 'fixApplied', 'preventionSteps', 'incidentStart', 'incidentEnd']
    for (const field of required) {
      if (!rca[field as keyof typeof rca]) {
        throw new Error(`Missing RCA field: ${field}`)
      }
    }

    const start = new Date(rca.incidentStart)
    const end = new Date(rca.incidentEnd)
    const mttrMinutes = (end.getTime() - start.getTime()) / 1000 / 60

    // Transaction — both writes succeed or both fail
    const client = await pgPool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO rca_records 
          (work_item_id, root_cause_category, fix_applied, prevention_steps, incident_start, incident_end)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, rca.rootCauseCategory, rca.fixApplied, rca.preventionSteps, start, end]
      )

      await client.query(
        'UPDATE work_items SET resolved_time = $1, mttr_minutes = $2 WHERE id = $3',
        [end, mttrMinutes, id]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return { id, mttrMinutes: mttrMinutes.toFixed(2) }
  }

  async getDashboard() {
    // Try Redis cache first
    const cached = await redisClient.get('dashboard:incidents')
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pgPool.query(
      `SELECT * FROM work_items WHERE status != 'CLOSED'
       ORDER BY CASE priority WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 END`
    )

    // Cache for 10 seconds
    await redisClient.setEx('dashboard:incidents', 10, JSON.stringify(result.rows))
    return result.rows
  }
}