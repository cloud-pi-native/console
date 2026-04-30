export function sonarProjectPropertiesFile(projectKey: string) {
  return [
    `sonar.projectKey=${projectKey}`,
    'sonar.qualitygate.wait=true',
  ]
}
