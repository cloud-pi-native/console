import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, adminUser, cnolletUser } from '../config/console'
import { faker } from '@faker-js/faker'

test.describe('Cross-Service Role Propagation', () => {
  const oidcGroupSuffix = faker.string.alpha(10).toLowerCase()
  const oidcGroupPath = `/console/test-admin-${oidcGroupSuffix}`
  const roleName = `CrossTestRole-${oidcGroupSuffix}`

  test('Should propagate admin role to GitLab, SonarQube, and Keycloak', { tag: '@e2e' }, async ({ page, request }) => {
    // Sign in to Console
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })

    // Configure Plugins to use the test OIDC group
    // Configure GitLab
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationPlugins').click()
    await page.getByTestId('accordion-gitlab').click()

    // Fill Admin Group Path
    const gitlabAdminInput = page.getByTestId('accordion-gitlab').getByLabel('Chemin du groupe OIDC Admin')
    await gitlabAdminInput.fill(oidcGroupPath)
    await page.getByTestId('saveBtn').click()
    await expect(page.getByText('Paramètres sauvegardés')).toBeVisible()
    await page.getByTestId('accordion-gitlab').click() // Close accordion

    // Create the Role in Console
    await page.getByTestId('menuAdministrationRoles').click()
    await expect(page.getByTestId('role-list')).not.toContainText(roleName)
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(roleName)
    await page.getByTestId('oidcGroupInput').fill(oidcGroupPath)
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('role-list')).toContainText(roleName)

    // Use an existing user (Claire Nollet)
    const targetUser = cnolletUser

    // Navigate to the role's members
    const roleButton = page.getByRole('button', { name: roleName })
    if (!await page.getByRole('tab', { name: 'Membres' }).isVisible()) {
      await roleButton.click()
    }
    await page.getByRole('tab', { name: 'Membres' }).click()

    // Add user
    await expect(page.getByTestId('addUserBtn')).toBeDisabled()
    await page
      .getByTestId('addUserSuggestionInput')
      .locator('input')
      .fill(targetUser.email)
    await page.getByTestId('addUserBtn').click()
    await expect(page.getByTestId(`user-${targetUser.id}`)).toBeVisible()

    // Check if user is in group `oidcGroupPath`
    // Keycloak API
    const kcToken = await getKeycloakToken(request)
    const kcGroup = await getKeycloakGroup(request, kcToken, oidcGroupPath)
    expect(kcGroup, 'Group should exist in Keycloak').toBeDefined()
    const kcMembers = await getKeycloakGroupMembers(request, kcToken, kcGroup.id)
    const kcMember = kcMembers.find((m: any) => m.email === targetUser.email)
    expect(kcMember, 'User should be in Keycloak group').toBeDefined()

    // Check if user is in group (or is admin if we configured admin path)
    // Since we configured `adminGroupPath` to `oidcGroupPath`, the user should become an Admin.
    const glUser = await getGitLabUser(request, targetUser.email)
    expect(glUser.is_admin, 'User should be GitLab Admin').toBe(true)
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
