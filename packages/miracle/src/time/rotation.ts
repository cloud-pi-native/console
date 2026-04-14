import type { Context } from 'alchemy'
import { Resource } from 'alchemy'

export interface TimeRotationProps {
  tick: string
  rotateEveryDays: number
}

export interface TimeRotationState {
  tick: string
  rotatedAt: string
  generation: number
}

export type TimeRotationOutput = Resource<'time:Rotation'> & TimeRotationState

const dayRegExp = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDay(value: string): number {
  const match = dayRegExp.exec(value)
  if (!match) throw new Error(`Invalid day format: ${value}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return Date.UTC(year, month - 1, day)
}

function diffDays(fromDay: string, toDay: string): number {
  const from = parseDay(fromDay)
  const to = parseDay(toDay)
  return Math.floor((from - to) / (24 * 60 * 60 * 1000))
}

export const TimeRotation = Resource('time:Rotation', async function (
  this: Context<TimeRotationOutput, TimeRotationProps>,
  _id: string,
  props: TimeRotationProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  if (props.rotateEveryDays <= 0) throw new Error('rotateEveryDays must be > 0')

  const previous = this.phase === 'update' ? this.output : undefined
  if (!previous) {
    return this.create({ tick: props.tick, rotatedAt: props.tick, generation: 1 })
  }

  const shouldRotate = diffDays(props.tick, previous.rotatedAt) >= props.rotateEveryDays
  if (shouldRotate) {
    return this.create({ tick: props.tick, rotatedAt: props.tick, generation: previous.generation + 1 })
  }
  return this.create({ tick: props.tick, rotatedAt: previous.rotatedAt, generation: previous.generation })
})
