import { Schema } from 'effect'

/* eslint-disable unicorn/throw-new-error -- class factory, `new` breaks TS2350 */
export class ClusterNotFound extends Schema.TaggedError<ClusterNotFound>()('ClusterNotFound', {
  clusterId: Schema.String,
}) {}

export class LabelTaken extends Schema.TaggedError<LabelTaken>()('LabelTaken', {
  label: Schema.String,
}) {}

export class EnvironmentsActive extends Schema.TaggedError<EnvironmentsActive>()('EnvironmentsActive', {}) {}

export class HookFailed extends Schema.TaggedError<HookFailed>()('HookFailed', {
  event: Schema.String,
}) {}
/* eslint-enable unicorn/throw-new-error */

export type ClusterError = ClusterNotFound | LabelTaken | EnvironmentsActive | HookFailed
