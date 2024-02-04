import { readFileSync, readdirSync, statSync, writeFile } from 'fs'
import YAML from "yaml"

const newVersion = process.argv[2]
if (!newVersion) {
  console.log('No new version provided, exiting...');
  process.exit(1)
}

const rootPackage = JSON.parse(readFileSync("./package.json", "utf8"))
const oldVersion = rootPackage.version
const pnpmWorkspace = readFileSync("./pnpm-workspace.yaml", "utf8")
const packages = (YAML.parse(pnpmWorkspace)).packages
  .filter(dir => !dir.startsWith("!"))
  .map(rootDir => rootDir.split('/')[0])
  .map(rootDir => readdirSync(rootDir)
    .map(packageDir => [rootDir, packageDir].join('/')))
  .flat()
  .filter(packageDir => statSync([packageDir, 'package.json']
    .join('/'), { throwIfNoEntry: false }))
  .map(packageDir => [packageDir, 'package.json'].join('/'))

packages.push('package.json')

await Promise.all(packages.map(packagePath => {
  const packageJSON = JSON.parse(readFileSync(packagePath, "utf8"))
  const newPackageJSON = updateJSON(packageJSON)
  return writeFile(packagePath, JSON.stringify(newPackageJSON, null, 2), {encoding: 'utf-8'}, () => {})
}))

function updateDeps(deps) {
  for (const packageName of Object.keys(deps)) {
    if (packageName.startsWith('@dso-console')) deps[packageName] = newVersion 
  }
  return deps
}

function updateJSON(packageJSON) {
  return {
    ...packageJSON,
    ...packageJSON.dependencies && { dependencies: updateDeps(packageJSON.dependencies) },
    ...packageJSON.devDependencies && { devDependencies: updateDeps(packageJSON.devDependencies) },
    ...packageJSON.peerDependencies && { peerDependencies: updateDeps(packageJSON.peerDependencies) },
    ...!newVersion.startsWith('workspace') && { version: newVersion }
  }
}

console.log(oldVersion)
