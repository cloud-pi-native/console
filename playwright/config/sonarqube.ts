export interface SonarqubeConfig {
  url: string
  adminUser: string
  adminPass: string
}

export function loadSonarqubeConfig(): SonarqubeConfig {
  const protocol = process.env.SONARQUBE_PROTOCOL || 'http'
  const domain = process.env.SONARQUBE_DOMAIN || 'localhost'
  const port = process.env.SONARQUBE_PORT ? `:${process.env.SONARQUBE_PORT}` : ''
  const url = `${protocol}://${domain}${port}`

  return {
    url,
    adminUser: process.env.SONARQUBE_ADMIN_USERNAME?.trim() || 'admin',
    adminPass: process.env.SONARQUBE_ADMIN_PASSWORD?.trim() || 'admin',
  }
}
