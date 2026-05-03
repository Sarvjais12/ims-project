export type WorkItemStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED'

export interface IWorkItemState {
  status: WorkItemStatus
  next(): WorkItemStatus
  canClose(hasRca: boolean): boolean
}

export class OpenState implements IWorkItemState {
  status: WorkItemStatus = 'OPEN'
  next(): WorkItemStatus { return 'INVESTIGATING' }
  canClose(): boolean { return false }
}

export class InvestigatingState implements IWorkItemState {
  status: WorkItemStatus = 'INVESTIGATING'
  next(): WorkItemStatus { return 'RESOLVED' }
  canClose(): boolean { return false }
}

export class ResolvedState implements IWorkItemState {
  status: WorkItemStatus = 'RESOLVED'
  next(): WorkItemStatus { return 'CLOSED' }
  canClose(hasRca: boolean): boolean { return hasRca }
}

export class ClosedState implements IWorkItemState {
  status: WorkItemStatus = 'CLOSED'
  next(): WorkItemStatus { throw new Error('Work item already CLOSED') }
  canClose(): boolean { return true }
}

export function getState(status: WorkItemStatus): IWorkItemState {
  switch (status) {
    case 'OPEN':          return new OpenState()
    case 'INVESTIGATING': return new InvestigatingState()
    case 'RESOLVED':      return new ResolvedState()
    case 'CLOSED':        return new ClosedState()
  }
}