import { pgPool } from './postgres'
import { SignalModel } from './SignalModel'
import { Signal } from '../ingestion/RingBuffer'

// Called by DebounceEngine when NEW component window opens
export async function createWorkItem(signal: Signal): Promise<string> {
  const priority = getPriority(signal.componentType)

  const result = await pgPool.query(
    `INSERT INTO work_items 
      (component_id, component_type, status, priority, first_signal_time)
     VALUES ($1, $2, 'OPEN', $3, $4)
     RETURNING id`,
    [signal.componentId, signal.componentType, priority, signal.timestamp]
  )

  const workItemId = result.rows[0].id
  console.log(`[WorkItem] Created ${workItemId} for ${signal.componentId} — ${priority}`)
  return workItemId
}

// Called by DebounceEngine for every signal — links to work item in Mongo
export async function linkSignal(
  workItemId: string,
  signal: Signal,
  signalNumber: number
): Promise<void> {
  await SignalModel.create({
    workItemId,
    componentId: signal.componentId,
    componentType: signal.componentType,
    message: signal.message,
    timestamp: signal.timestamp,
    signalNumber
  })
}

// Strategy pattern for priority — P0 for RDBMS, P2 for Cache etc
function getPriority(componentType: string): string {
  const map: Record<string, string> = {
    RDBMS: 'P0',
    API:   'P1',
    MCP:   'P1',
    QUEUE: 'P1',
    CACHE: 'P2'
  }
  return map[componentType] ?? 'P2'
}