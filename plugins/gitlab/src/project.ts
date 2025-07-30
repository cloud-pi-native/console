import * as fs from 'node:fs'
import path from 'node:path'
import { getApi } from './utils'

const baseDir = path.resolve(__dirname, '../../files/').split(':')[1]

const gitlabCiYml = (fs.readFileSync(`${baseDir}/.gitlab-ci.yml`)).toString()
const mirrorSh = (fs.readFileSync(`${baseDir}/mirror.sh`)).toString()

const mirrorFirstActions: CommitAction[] = [
  {
    action: 'create',
    filePath: '.gitlab-ci.yml',
    content: gitlabCiYml,
    execute_filemode: false,
  },
  {
    action: 'create',
    filePath: 'mirror.sh',
    content: mirrorSh,
    execute_filemode: true,
  },
]

export async function provisionMirror(repoId: number) {
  const api = getApi()
  await api.Commits.create(repoId, 'main', 'ci: :construction_worker: first mirror', mirrorFirstActions)
}

interface CommitAction {
  /** The action to perform */
  action: 'create' | 'delete' | 'move' | 'update' | 'chmod'
  /** Full path to the file. Ex. lib/class.rb */
  filePath: string
  /** Original full path to the file being moved.Ex.lib / class1.rb */
  previousPath?: string
  /** File content, required for all except delete. Optional for move */
  content?: string
  /** text or base64. text is default. */
  encoding?: string
  /** Last known file commit id. Will be only considered in update, move and delete actions. */
  lastCommitId?: string
  /** When true/false enables/disables the execute flag on the file. Only considered for chmod action. */
  execute_filemode?: boolean
}
