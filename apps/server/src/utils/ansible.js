import { spawn } from 'node:child_process'
import app from '../app.js'

/**
* Create a childProcess
* @param {string} command Command that will be execute in the childProcess.
* @param {string[]} args Arguments used with the given command.
*/
export const spawnProcess = async (command, args) => {
  try {
    const childProcess = spawn(command, args)

    childProcess.stdout.on('data', (data) => {
      console.log(`Child process [${command} ${args.join(' ')}] : \n\n${data}`)
    })

    childProcess.stderr.on('data', (data) => {
      console.error(`Child process [${command} ${args.join(' ')}] : \n\n${data}`)
    })

    childProcess.on('close', (code) => {
      app.log.info({
        description: 'Child process',
        command,
        args,
        message: `Child process exited with code ${code}`,
      })
    })

    return childProcess
  } catch (error) {
    throw new Error(error)
  }
}

/**
* Project provisionning using a childProcess
*/
export const projectProvisioning = async () => {
  // TODO: Replace following commands by a real ansible playbook call
  try {
    await spawnProcess('ls', ['-la', '/dso'])
  } catch (error) {
    app.log.error(error)
  }

  try {
    await spawnProcess('ansible', ['--version'])
  } catch (error) {
    app.log.error(error)
  }
}
