const ansibleArgsDictionary = {
  repName: 'REPO_NAME',
  orgName: 'ORGANIZATION_NAME',
  ownerEmail: 'EMAIL',
  projectName: 'PROJECT_NAME',
  envList: 'ENV_LIST',
  externalRepoUrl: 'REPO_SRC',
  internalRepoName: 'REPO_DEST',
  externalUserName: 'GIT_INPUT_USER',
  externalToken: 'GIT_INPUT_PASSWORD',
  isInfra: 'IS_INFRA',
}

export const convertVars = (vars) => {
  return Object.entries(vars)
    .map(([key, value]) => {
      if (key === 'isPrivate') {
        return null
      }
      if (!ansibleArgsDictionary?.[key]) {
        return null
      }
      const varKey = ansibleArgsDictionary?.[key] ?? key // get the equivalent key in dictionnary or the one who was passed
      const varValue = Array.isArray(value) ? JSON.stringify(value) : value // if the value is an array, stringify it, else let as it is
      return [
        '-e',
      `${varKey}=${varValue}`,
      ]
    })
    .filter(el => el)
    .flat(1)
}
