import type { Scope } from 'alchemy'
import os from 'node:os'
import path from 'node:path'
import alchemy from 'alchemy'

let stageScope: Scope | undefined

function getStageName() {
  return process.env.ALCHEMY_STAGE ?? process.env.STAGE ?? process.env.NODE_ENV ?? 'dev'
}

function getAlchemyPassword() {
  return process.env.ALCHEMY_PASSWORD
    ?? process.env.ALCHEMY_SECRET_PASSPHRASE
    ?? process.env.SECRET_PASSPHRASE
    ?? process.env.KEYCLOAK_ADMIN_PASSWORD
}

export async function getMiracleStageScope(): Promise<Scope> {
  if (stageScope) return stageScope

  const stage = getStageName()
  const rootDir = process.env.ALCHEMY_ROOT_DIR ?? path.join(os.tmpdir(), 'cpn-console-alchemy')
  const root = await alchemy('cpn-console-miracle-keycloak', {
    stage,
    rootDir,
    password: getAlchemyPassword(),
    quiet: true,
    noTrack: true,
    destroyOrphans: true,
  })
  stageScope = root.children.get(stage) ?? root
  return stageScope
}

export async function runMiracleScope<T>(scopeId: string, fn: (scope: Scope) => Promise<T>): Promise<T> {
  const parent = await getMiracleStageScope()
  return alchemy.run(scopeId, {
    parent,
    password: getAlchemyPassword(),
    quiet: true,
    noTrack: true,
    destroyOrphans: true,
  }, async (_scope: Scope) => {
    return fn(_scope)
  })
}
