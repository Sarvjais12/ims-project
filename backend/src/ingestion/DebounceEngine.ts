import { Signal } from './RingBuffer'

interface DebounceWindow {
  workItemId: string
  componentId: string
  signalCount: number
  firstSignalTime: Date
  timer: NodeJS.Timeout
}

type WorkItemCreator = (signal: Signal) => Promise<string>
type SignalLinker = (workItemId: string, signal: Signal, count: number) => Promise<void>

export class DebounceEngine {
  private windows: Map<string, DebounceWindow> = new Map()
  private windowMs: number
  private threshold: number

  constructor(
    private createWorkItem: WorkItemCreator,
    private linkSignal: SignalLinker,
    windowMs: number = 10000,  // 10 seconds
    threshold: number = 100    // 100 signals
  ) {
    this.windowMs = windowMs
    this.threshold = threshold
  }

  async process(signal: Signal): Promise<void> {
    const existing = this.windows.get(signal.componentId)

    if (existing) {
      // Window already open for this component
      existing.signalCount++

      if (existing.signalCount <= this.threshold) {
        await this.linkSignal(existing.workItemId, signal, existing.signalCount)
      }
      // Beyond threshold — still linked to same work item, just not writing every signal
      return
    }

    // No window — create new work item
    const workItemId = await this.createWorkItem(signal)

    const timer = setTimeout(() => {
      // Window expired — close it
      const window = this.windows.get(signal.componentId)
      if (window) {
        console.log(`[Debounce] Window closed for ${signal.componentId} — ${window.signalCount} signals → 1 work item`)
        this.windows.delete(signal.componentId)
      }
    }, this.windowMs)

    this.windows.set(signal.componentId, {
      workItemId,
      componentId: signal.componentId,
      signalCount: 1,
      firstSignalTime: signal.timestamp,
      timer
    })

    await this.linkSignal(workItemId, signal, 1)
  }

  getActiveWindows() {
    return this.windows.size
  }
}