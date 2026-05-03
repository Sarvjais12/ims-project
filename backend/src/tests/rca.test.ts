import { getState } from '../workflow/states'

describe('State Machine', () => {

  test('OPEN can only go to INVESTIGATING', () => {
    const state = getState('OPEN')
    expect(state.next()).toBe('INVESTIGATING')
  })

  test('OPEN cannot close', () => {
    const state = getState('OPEN')
    expect(state.canClose(true)).toBe(false)
  })

  test('RESOLVED can close WITH rca', () => {
    const state = getState('RESOLVED')
    expect(state.canClose(true)).toBe(true)
  })

  test('RESOLVED cannot close WITHOUT rca', () => {
    const state = getState('RESOLVED')
    expect(state.canClose(false)).toBe(false)
  })

  test('CLOSED throws on next()', () => {
    const state = getState('CLOSED')
    expect(() => state.next()).toThrow('Work item already CLOSED')
  })

  test('INVESTIGATING goes to RESOLVED', () => {
    const state = getState('INVESTIGATING')
    expect(state.next()).toBe('RESOLVED')
  })
})