import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

export async function readMirrorScriptContent() {
  return await readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
}
