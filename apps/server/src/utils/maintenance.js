import { getConnection, synchroniseModels } from '../connect.js'
import { getAllProject, updateProject } from '../models/project-queries.js'
import { convertVars } from './tools.js'

const commands = {}

commands.get_repos = async () => {
  const projects = await getAllProject()
  projects.forEach(proj => {
    if (proj.data.repos) {
      proj.data.repos.forEach(rep => {
        const ansibleData = convertVars({
          ...rep,
          ...proj.data,
          ownerEmail: proj.data.owner.email,
        })
        console.log(`${ansibleData.join(' ')} --connection=local`)
      })
    }
  })
}

commands.get_projects = async () => {
  const projects = await getAllProject()
  projects.forEach(proj => {
    if (proj.data.repos) {
      const ansibleData = convertVars({ ...proj.data, ownerEmail: proj.data.owner.email })
      console.log(`${ansibleData.join(' ')} --connection=local`)
    }
  })
}

commands.update_projects = async () => {
  console.log('Mise à jour des projets en BDD...')
  const projects = await getAllProject()
  projects.forEach(async (proj) => {
    let needUpdate = false
    if (proj.data.repos) {
      proj.data.repos.forEach(async (rep) => {
        if (rep.isInfra === undefined || rep.isPrivate === undefined) {
          rep.isInfra = rep.isInfra ?? false
          rep.isPrivate = rep.isPrivate ?? false
          needUpdate = true
        }
      })
    }
    if (!proj.data.status) {
      proj.data.status = 'created'
      needUpdate = true
    }
    if (needUpdate) {
      console.log(proj.data)
      await updateProject(proj.data)
    }
  })
}

async function main (command) {
  try {
    await getConnection()
    await synchroniseModels()
  } catch (error) {
    console.log(error.message)
    throw error
  }
  await commands[command]()
}

if (typeof require !== 'undefined' && require.main === module) {
  main(process.argv[2])
}

export const maintenance = commands
