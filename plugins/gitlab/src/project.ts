import type { CommitAction } from '@cpn-console/miracle'
import * as fs from 'node:fs/promises'
import path from 'node:path'

import { getClient } from './utils.js'

export async function provisionMirror(repoId: number) {
  const baseDir = path.resolve(import.meta.url, '../../files/').split(':')[1]

  const gitlabCiYml = (
    await fs.readFile(`${baseDir}/.gitlab-ci.yml`)
  ).toString()
  const mirrorSh = (await fs.readFile(`${baseDir}/mirror.sh`)).toString()

  const mirrorFirstActions: CommitAction[] = [
    {
      action: 'create',
      file_path: '.gitlab-ci.yml',
      content: gitlabCiYml,
      execute_filemode: false,
    },
    {
      action: 'create',
      file_path: 'mirror.sh',
      content: mirrorSh,
      execute_filemode: true,
    },
  ]
  const api = getClient()
  await api.commitsCreate(
    repoId,
    'main',
    'ci: :construction_worker: first mirror',
    mirrorFirstActions,
  )
}
