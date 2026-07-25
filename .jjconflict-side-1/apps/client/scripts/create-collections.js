#!env node
import path from 'node:path'

import { createCustomCollectionFile } from '@gouvminint/vue-dsfr/meta'
import { Command } from 'commander'

const program = new Command()

program
  .option('-s, --source <filepath>', 'Chemin vers le fichier de tuples [IconifyJSON, string[]]')
  .option('-t, --target <filepath>', 'Chemin vers le fichier destination (src/icons.ts par défaut)')
  .parse(process.argv)

const options = program.opts()

if (options.source && options.target) {
  createCustomCollectionFile(path.resolve(process.cwd(), options.source), path.resolve(process.cwd(), options.target))
}
