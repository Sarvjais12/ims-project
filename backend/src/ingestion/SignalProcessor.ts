import { RingBuffer, Signal } from './RingBuffer'
import { DebounceEngine } from './DebounceEngine'

export class SignalProcessor {
  private running: boolean = false
  private processedCount: number = 0
  private intervalHandle?: NodeJS.Timeout
  private metricsHandle?: NodeJS.Timeout

  constructor(
    private buffer: RingBuffer,
    private debounce: DebounceEngine,
    private drainIntervalMs: number = 50  // drain every 50ms
  ) {}

  start() {
    this.running = true

    // Worker — drains buffer every 50ms
    this.intervalHandle = setInterval(async () => {
      const batch = this.buffer.drain(200)
      for (const signal of batch) {
        await this.debounce.process(signal)
        this.processedCount++
      }
    }, this.drainIntervalMs)

    // Metrics — prints signals/sec every 5 seconds
    this.metricsHandle = setInterval(() => {
      const perSec = (this.processedCount / 5).toFixed(1)
      console.log(`[Metrics] ${perSec} signals/sec | Buffer: ${this.buffer.length} | Active windows: ${this.debounce.getActiveWindows()}`)
      this.processedCount = 0
    }, 5000)

    console.log('[SignalProcessor] Started')
  }

  stop() {
    this.running = false
    if (this.intervalHandle) clearInterval(this.intervalHandle)
    if (this.metricsHandle) clearInterval(this.metricsHandle)
  }
}