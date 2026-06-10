#!env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createCustomCollectionFile } from '@gouvminint/vue-dsfr/meta'
import { Command } from 'commander'

const grepResult = spawnSync('grep', [
  // recursive
  '-r',
  // exclude node_modules
  '--exclude-dir=node_modules',
  // exclude icons.js and icon-collections.ts files to avoid collecting icons that are not used in the project
  '--exclude-dir=scripts',
  '--exclude=icon-collections.ts',
  // only print the matched part of the line
  '-ohs',
  // regex to match icon names starting with ri:icon-name
  'ri:[a-z0-9-]*',
  // search in the whole project
  '../..',
], { shell: false })
const result = grepResult.stdout.toString()
  .split('\n')
  .filter(Boolean)
  .sort()
  .filter((value, index, self) => self.indexOf(value) === index)
  .map(value => value.split(':')[1])
  .filter(Boolean)
  .map(value => `  '${value}',`)
  .join('\n')
console.log(result)

// open console/apps/client/src/icons.js and replace the content with the result of the command above, then run `npm run icons` to generate the icon collections
// determine lines to replace in src/icons.js
const iconsFilePath = path.resolve(process.cwd(), 'scripts/icons.js')
const fileContent = fs.readFileSync(iconsFilePath, 'utf-8')
const startIndex = fileContent.indexOf('const riIconNames = [')
const endIndex = fileContent.indexOf(']', startIndex) + 1
const newFileContent = `${fileContent.slice(0, startIndex)}const riIconNames = [\n${result}\n]${fileContent.slice(endIndex)}`
fs.writeFileSync(iconsFilePath, newFileContent)

const transformIconsProgram = new Command()

transformIconsProgram
  .option('-s, --source <filepath>', 'Chemin vers le fichier de tuples [IconifyJSON, string[]]')
  .option('-t, --target <filepath>', 'Chemin vers le fichier destination (src/icons.ts par défaut)')
  .parse(process.argv)

const options = transformIconsProgram.opts()

if (options.source && options.target) {
  createCustomCollectionFile(path.resolve(process.cwd(), options.source), path.resolve(process.cwd(), options.target))
}
