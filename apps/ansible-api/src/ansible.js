import { spawn } from "child_process";
const PLAYBOOK_DIR = process.env.PLAYBOOK_DIR

const ansible = ((playbooks, args) => {
  const playbook = playbooks[0]
  const playbookSpawn = spawn('ansible-playbook', [`${PLAYBOOK_DIR}${playbook}`, ...args])
  console.log(`run ${playbook}`);
  let logs = Buffer.alloc(0)
  playbookSpawn.stdout.on('data', (data) => { logs+=data })
  playbookSpawn.stderr.on('data', (data) => { logs+=data })
  playbookSpawn.on('close', (code) => {
    if (code !== 0) {
      console.error(`Playbook ${playbook} failed with rc ${code}`);
      console.error(logs.toString())
      return
    }
    console.info(logs.toString())
    playbooks.shift()
    ansible(playbooks, args)
  })
  playbookSpawn.on('error', (err) => {
    console.log(err)
  })
})

export { ansible }