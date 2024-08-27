import { getApi } from './utils.js'

export async function addProjectGroupMember(projectName: string, groupName: string, accessLevel: number = 3): Promise<any> {
  const api = getApi()
  const members = await api.projects.listProjectMembers(projectName)
  const member = members.data.find(m => m.entity_name === groupName)
  if (member?.id) { // member.id is always set pb comes from bad swagger
    if (member.role_id !== accessLevel && member.entity_type !== 'g') {
      // le membre semble être incorrectement paramétré, suppression pour recréation
      await api.projects.deleteProjectMember(projectName, member.id)
    } else {
      // tout va bien
      return
    }
  }
  // Création du membre
  await api.projects.createProjectMember(projectName, {

    role_id: accessLevel,
    member_group: {

      group_name: groupName,
      group_type: 3,
    },
  })
}
