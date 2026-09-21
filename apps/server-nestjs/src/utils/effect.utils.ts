import { Effect, Schedule } from 'effect'

export const retried = Effect.retry({
  schedule: Schedule.exponential('50 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
})
