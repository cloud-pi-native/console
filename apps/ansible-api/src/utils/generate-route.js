import { playbookDir } from './env.js'
import { readFileSync } from 'fs'
import { parse } from 'yaml'
import { resolve } from 'path'
import { controller as handler } from '../controllers/generic.js'

export const generateRoute = (path, method) => {
  const playbook = `${path.slice(1).replaceAll('/', '_')}_${method}.yml`
  const playbookPath = resolve(playbookDir, playbook)
  const playbookContent = readFileSync(`${playbookPath}`).toString()
  if (playbookContent?.length === 0) {
    throw Error(`Erreur: ${playbook} semble vide`)
  }
  const playbookParsed = parse(playbookContent)
  const schema = { body: playbookParsed[0].vars.validation }
  if (!Array.isArray(playbookParsed) && !playbookParsed[0]?.vars?.validation) {
    throw Error(`Playbook ${playbook} does not have a validation vars`)
  }

  return {
    handler,
    schema,
    config: { playbook },
  }
}
