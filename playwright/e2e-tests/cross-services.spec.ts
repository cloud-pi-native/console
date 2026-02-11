import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'
import { faker } from '@faker-js/faker'

test.describe('Cross-Service Role Propagation', () => {
  const oidcGroupSuffix = faker.string.alpha(10).toLowerCase()
  const oidcGroupPath = `/console/test-admin-${oidcGroupSuffix}`
  const roleName = `CrossTestRole-${oidcGroupSuffix}`

  test('Should propagate admin role to GitLab, SonarQube, and Keycloak', { tag: '@cross-service-role-propagation' }, async ({ page, request }) => {
    // 1. Sign in to Console
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    // 2. Configure Plugins to use the test OIDC group
    // Configure GitLab
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationPlugins').click()
    await page.getByTestId('gitlab-plugin-config-btn').click()

    // Fill Admin Group Path
    const gitlabAdminInput = page.getByLabel('Chemin du groupe OIDC Admin')
    await gitlabAdminInput.fill(oidcGroupPath)
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Configuration enregistrée')).toBeVisible()
    await page.getByRole('button', { name: 'Fermer' }).click()

    // Configure SonarQube
    await page.getByTestId('sonarqube-plugin-config-btn').click()
    const sonarAdminInput = page.getByLabel('Chemin du groupe OIDC Admin')
    await sonarAdminInput.fill(oidcGroupPath)
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Configuration enregistrée')).toBeVisible()
    await page.getByRole('button', { name: 'Fermer' }).click()

    // 3. Create the Role in Console
    await page.getByTestId('menuAdministrationRoles').click()
    await page.getByTestId('addRoleBtn').click()
    await page.getByTestId('roleNameInput').fill(roleName)
    await page.getByTestId('oidcGroupInput').fill(oidcGroupPath)
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('role-list')).toContainText(roleName)

    // 4. Create Subject User in Keycloak (via API for speed/reliability)
    const targetUser = { email: 'claire.nollet@test.com', id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567' } // ID from config/console.ts

    // 5. Add User to Role
    // Navigate to the role's members
    await page.getByTestId(`role-${roleName}-edit`).click()
    await page.getByTestId('members-tab').click()

    // Add user
    await page.getByTestId('addUserSuggestionInput').locator('input').fill(targetUser.email)
    await page.getByTestId('addUserBtn').click()
    await expect(page.getByTestId(`user-${targetUser.id}`)).toBeVisible()

    // 6. Verify in Keycloak
    // Check if user is in group `oidcGroupPath`
    // Keycloak API
    const kcToken = await getKeycloakToken(request)
    const kcGroup = await getKeycloakGroup(request, kcToken, oidcGroupPath)
    expect(kcGroup, 'Group should exist in Keycloak').toBeDefined()
    const kcMembers = await getKeycloakGroupMembers(request, kcToken, kcGroup.id)
    const kcMember = kcMembers.find((m: any) => m.email === targetUser.email)
    expect(kcMember, 'User should be in Keycloak group').toBeDefined()

    // 7. Verify in GitLab
    // Check if user is in group (or is admin if we configured admin path)
    // Since we configured `adminGroupPath` to `oidcGroupPath`, the user should become an Admin.
    const glUser = await getGitLabUser(request, targetUser.email)
    expect(glUser.is_admin, 'User should be GitLab Admin').toBe(true)

    // 8. Verify in SonarQube
    // Check if user is in group `oidcGroupPath`
    const sqUser = await getSonarQubeUserGroups(request, targetUser.email)
    // The group name in SonarQube will be `oidcGroupPath`.
    expect(sqUser.groups, 'User should be in SonarQube group').toContain(oidcGroupPath)
  })
})

// Helpers
async function getKeycloakToken(request: APIRequestContext) {
  const rootUrl = `${process.env.KEYCLOAK_PROTOCOL}://${process.env.KEYCLOAK_DOMAIN}`
  const adminResponse = await request.post(`${rootUrl}/realms/master/protocol/openid-connect/token`, {
    form: {
      username: process.env.KEYCLOAK_ADMIN || '',
      password: process.env.KEYCLOAK_ADMIN_PASSWORD || '',
      grant_type: 'password',
      client_id: 'admin-cli',
    },
  })
  const json = await adminResponse.json()
  return json.access_token
}

async function getKeycloakGroup(request: APIRequestContext, token: string, path: string) {
  const rootUrl = `${process.env.KEYCLOAK_PROTOCOL}://${process.env.KEYCLOAK_DOMAIN}`
  const response = await request.get(`${rootUrl}/admin/realms/${process.env.KEYCLOAK_REALM}/groups`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { search: path },
  })
  const groups = await response.json()
  return groups.find((g: any) => g.path === path)
}

async function getKeycloakGroupMembers(request: APIRequestContext, token: string, groupId: string) {
  const rootUrl = `${process.env.KEYCLOAK_PROTOCOL}://${process.env.KEYCLOAK_DOMAIN}`
  const response = await request.get(`${rootUrl}/admin/realms/${process.env.KEYCLOAK_REALM}/groups/${groupId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return await response.json()
}

async function getGitLabUser(request: APIRequestContext, email: string) {
  const response = await request.get(`${process.env.GITLAB_URL}/api/v4/users`, {
    headers: { 'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || '' },
    params: { search: email },
  })
  const users = await response.json()
  return users[0]
}

async function getSonarQubeUserGroups(request: APIRequestContext, email: string) {
  const auth = Buffer.from(`${process.env.SONAR_API_TOKEN}:`).toString('base64')
  const response = await request.get(`${process.env.SONARQUBE_URL}/api/users/groups`, {
    headers: { Authorization: `Basic ${auth}` },
    params: { login: email, ps: 500 },
  })
  return await response.json()
}
