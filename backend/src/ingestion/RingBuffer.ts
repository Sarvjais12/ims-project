export interface Signal {
  componentId: string
  componentType: 'RDBMS' | 'CACHE' | 'API' | 'QUEUE' | 'MCP'
  message: string
  timestamp: Date
}

export class RingBuffer {
  private buffer: (Signal | null)[]
  private readPtr: number = 0
  private writePtr: number = 0
  private size: number
  private count: number = 0

  constructor(size: number = 50000) {
    this.size = size
    this.buffer = new Array(size).fill(null)
  }

  push(signal: Signal): boolean {
    if (this.count === this.size) {
      // Buffer full — drop signal, don't crash
      console.warn(`[RingBuffer] FULL — dropping signal from ${signal.componentId}`)
      return false
    }

    this.buffer[this.writePtr] = signal
    this.writePtr = (this.writePtr + 1) % this.size
    this.count++
    return true
  }

  pop(): Signal | null {
    if (this.count === 0) return null

    const signal = this.buffer[this.readPtr]
    this.buffer[this.readPtr] = null
    this.readPtr = (this.readPtr + 1) % this.size
    this.count--
    return signal
  }

  // Drain up to batchSize signals at once
  drain(batchSize: number = 100): Signal[] {
    const batch: Signal[] = []
    for (let i = 0; i < batchSize; i++) {
      const signal = this.pop()
      if (!signal) break
      batch.push(signal)
    }
    return batch
  }

  get length() { return this.count }
  get isFull() { return this.count === this.size }
}