import { spawn } from 'node:child_process'
import app from '../app.js'

/**
* Create a subprocess
* @param {string} command Command that will be execute in the subprocess.
* @param {[string]} args Arguments used with the given command.
*/
const spawnProcess = async (command, args) => {
  try {
    const subProcess = spawn(command, args)

    subProcess.stdout.on('data', (data) => {
      console.log(`Child process [${command} ${args.join(' ')}] : \n\n${data}`)
    })

    subProcess.stderr.on('data', (data) => {
      console.error(`Child process [${command} ${args.join(' ')}] : \n\n${data}`)
    })

    subProcess.on('close', (code) => {
      app.log.info({
        description: 'Child process',
        command,
        args,
        message: `Child process exited with code ${code}`,
      })
    })

    return subProcess
  } catch (error) {
    throw new Error(error)
  }
}

/**
* Project provisionning using a subprocess
*/
export const projectProvisioning = async () => {
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
