import { api } from './utils.js'

/**
 *
 * @param {Integer} projectId
 */
export const setProjectTrigger = async (projectId) => {
  return await api.Triggers.add(projectId,
    {
      description: 'mirroring-from-external-repo',
    })
}
