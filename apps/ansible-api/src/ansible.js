import { spawn } from 'child_process'
import app from './app.js'
import { isProd, playbookDir } from './utils/env.js'
import { getLogInfos } from './utils/logger.js'

export const runPlaybook = (playbook, vars) => {
  const args = [
    '-i=./inventory/',
    '-c=local',
    '-e',
    JSON.stringify(vars),
  ]
  const command = `ansible-playbook ${playbook} ${args.join(' ')}`
  return new Promise((resolve, reject) => {
    const playbookSpawn = spawn(
      'ansible-playbook',
      [playbook, ...args],
      {
        cwd: playbookDir,
        env: {
          ...process.env,
          ANSIBLE_STDOUT_CALLBACK: isProd ? 'community.general.unixy' : 'default',
        },
      },
    )
    let logs = Buffer.alloc(0)
    playbookSpawn.stdout.on('data', (data) => { logs += data })
    playbookSpawn.stderr.on('data', (data) => { logs += data })
    playbookSpawn.on('close', (code) => {
      if (code !== 0) {
        resolve({
          command,
          status: 'FAIL',
          code,
          logs: logs.toString(),
        })
        return
      }
      resolve({
        command,
        status: 'OK',
        code,
        logs: logs.toString(),
      })
    })
    playbookSpawn.on('error', (err) => {
      app.log.error({
        ...getLogInfos(),
        message: 'Error occured when executing playbook',
      })
      resolve({
        command,
        status: 'ERROR',
        code: 'inconnu',
        logs: `${logs.toString()}\n${err.message}`,
      })
    })
  })
}
