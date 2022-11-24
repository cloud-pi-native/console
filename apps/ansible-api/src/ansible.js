import { spawn } from 'child_process'
import { access, constants } from 'fs'
import app from './app.js'

const PLAYBOOK_DIR = process.env.PLAYBOOK_DIR?.endsWith('/')
  ? process.env.PLAYBOOK_DIR
  : process.env.PLAYBOOK_DIR + '/'
const CONFIG_DIR = process.env.CONFIG_DIR?.endsWith('/')
  ? process.env.CONFIG_DIR
  : process.env.CONFIG_DIR + '/'

export const ansibleArgsDictionary = {
  repName: 'REPO_NAME',
  orgName: 'ORGANIZATION_NAME',
  ownerEmail: 'EMAIL',
  projectName: 'PROJECT_NAME',
  envList: 'ENV_LIST',
  externalRepoUrl: 'REPO_SRC',
  internalRepoName: 'REPO_DEST',
  externalUserName: 'GIT_INPUT_USER',
  externalToken: 'GIT_INPUT_PASSWORD',
}

export const ansible = (playbooks, args) => {
  const playbook = playbooks[0]
  const playbookSpawn = spawn('ansible-playbook', [`${PLAYBOOK_DIR}${playbook}`, ...args])
  app.log.info(`Run ${playbook}`)
  let logs = Buffer.alloc(0)
  playbookSpawn.stdout.on('data', (data) => { logs += data })
  playbookSpawn.stderr.on('data', (data) => { logs += data })
  playbookSpawn.on('close', (code) => {
    if (code !== 0) {
      app.log.error(`Playbook ${playbook} failed with rc ${code}`)
      app.log.error(logs.toString())
      return
    }
    app.log.info(logs.toString())
    playbooks.shift()
    if (playbooks.length) {
      ansible(playbooks, args)
    }
  })
  playbookSpawn.on('error', (err) => {
    app.log.error(err)
  })
  return playbookSpawn
}

export const checkPlaybooksAccess = (playbooksDictionary) => {
  Object.entries(playbooksDictionary).forEach(([route, paths]) => {
    paths.forEach(path => {
      access(`${PLAYBOOK_DIR}${path}`, constants.R_OK, err => {
        if (err) {
          app.log.error(`Error playbook ${path} is not readable for route ${route}`)
          process.exit(1)
        }
      })
    })
  })
}

export const runPlaybook = (playbooks, vars, env) => {
  const args = [
    '-i',
    `${PLAYBOOK_DIR}inventory/${env}`,
    '--vault-password-file',
    `${CONFIG_DIR}.vault-secret`,
    '--connection=local',
    '-e',
    `"${JSON.stringify(vars).replaceAll('"', '\\"')}"`,
  ]
  ansible(playbooks, args)
}
