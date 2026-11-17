interface MemberPatchInput {
  userId: string
  roles: string[]
}

type MemberPatch = (input: MemberPatchInput) => Promise<unknown>

export interface MemberRoleSync {
  toggle: (checked: boolean, userId: string, roleId: string, snapshotRoleIds: string[]) => Promise<void>
}

// Serializes role patches per member: rapid toggles accumulate their intent and a
// per-member drain loop ships the latest desired list once per burst, so a stale
// snapshot can never overwrite a toggle issued while a previous patch was in flight.
// Intent consumed before the patch await: a toggle arriving during a patch is shipped
// by the next loop turn. A failed patch drops that burst's intent; the caller reloads
// server state on error.
export function createMemberRoleSync(patch: MemberPatch, onSynced: () => void): MemberRoleSync {
  const queue = new Map<string, Promise<unknown>>()
  const desired = new Map<string, string[]>()

  const drain = async (userId: string): Promise<void> => {
    for (;;) {
      const roles = desired.get(userId)
      if (!roles) return
      desired.delete(userId)
      await patch({ userId, roles })
      onSynced()
    }
  }

  return {
    async toggle(checked, userId, roleId, snapshotRoleIds) {
      const base = desired.get(userId) ?? snapshotRoleIds
      desired.set(userId, checked ? [...base, roleId] : base.filter(id => id !== roleId))

      const previous = queue.get(userId) ?? Promise.resolve()
      const task = previous.catch(() => {}).then(() => drain(userId))
      queue.set(userId, task)
      try {
        await task
      } finally {
        if (queue.get(userId) === task) queue.delete(userId)
      }
    },
  }
}
