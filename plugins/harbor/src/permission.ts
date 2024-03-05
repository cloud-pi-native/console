import { getApi } from './utils.js'

/**
 * @param {String} projectName - The name of harbor project
 * @param {String} groupName - The name of the keycloak group
 * @param {Number} accessLevel - By default 3 (guest)
 * @returns {Promise}
 */
export const addProjectGroupMember = async (projectName: string, groupName: string, accessLevel: number = 3): Promise<any> => {
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
  // eslint-disable-next-line camelcase
    role_id: accessLevel,
    member_group: {
    // eslint-disable-next-line camelcase
      group_name: groupName,
      group_type: 3,
    },
  })
}
