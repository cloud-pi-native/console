import { spawn } from 'child_process'
import app from './app.js'
import { playbookDir } from './utils/env.js'
import { getLogInfos } from './utils/logger.js'

export function responseFormatter (status, code, logs) {
  return {
    command: this.command,
    status,
    code,
    logs: logs.toString(),
  }
}

export const runPlaybook = (playbook, vars) => {
  const args = [
    '-i=./inventory/',
    '-c=local',
    '-e',
    JSON.stringify(vars),
  ]
  const response = responseFormatter.bind({ command: `ansible-playbook ${playbook} ${args.join(' ')}` })
  return new Promise((resolve, reject) => {
    const playbookSpawn = spawn(
      'ansible-playbook',
      [playbook, ...args],
      {
        cwd: playbookDir,
        env: {
          ...process.env,
          ANSIBLE_STDOUT_CALLBACK: 'community.general.unixy',
        },
      },
    )
    let logs = Buffer.alloc(0)
    playbookSpawn.stdout.on('data', (data) => { logs += data })
    playbookSpawn.stderr.on('data', (data) => { logs += data })
    playbookSpawn.on('close', (code) => {
      if (code !== 0) {
        reject(response('FAIL', code, logs))
        return
      }
      resolve(response('OK', code, logs))
    })
    playbookSpawn.on('error', (err) => {
      app.log.error({
        ...getLogInfos(),
        message: 'Error occured when executing playbook',
      })
      reject(response('ERROR', 'inconnu', `${logs.toString()}\n${err.message}`))
    })
  })
}
