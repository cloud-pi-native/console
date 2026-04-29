import { generateProjectKey, generateRandomPassword } from '@cpn-console/hooks'

export { generateProjectKey, generateRandomPassword }

export function sonarProjectPropertiesFile(projectKey: string) {
  return [
    `sonar.projectKey=${projectKey}`,
    'sonar.qualitygate.wait=true',
  ]
}
