import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { clientURL, cnolletUser, signInCloudPiNative, testUser } from '../config/console'
import { addEnvToProject, addProject, addRandomRepositoryToProject, deleteProject } from './utils'

async function openProjectByName({ page, projectName }: { page: Page, projectName: string }) {
  await page.getByTestId('menuMyProjects').click()
  await page.getByRole('link', { name: projectName }).click()
}

async function openProjectRoleByName({ page, roleName }: { page: Page, roleName: string }) {
  await page.getByTestId('test-tab-roles').click()
  await page
    .locator('[data-testid$="-tab"]')
    .filter({ hasText: roleName })
    .click()
}

async function assignPerms({
  page,
  roleName,
  perms,
}: {
  page: Page
  roleName: string
  perms: readonly string[]
}) {
  await openProjectRoleByName({ page, roleName })
  for (const key of perms) {
    const input = page.locator(`#${key}-cbx`)
    await expect(input).toBeVisible()
    await expect(input).toBeEnabled()
    if (await input.isChecked())
      continue
    const label = page.locator(`label[for="${key}-cbx"]`)
    if (await label.count()) {
      await label.first().click({ force: true })
    } else {
      await input.check({ force: true })
    }
    await expect(input).toBeChecked()
  }
  await expect(page.getByTestId('saveBtn')).toBeEnabled()
  await page.getByTestId('saveBtn').click()
  await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')
  await expect(page.getByTestId('saveBtn')).toBeDisabled()
}

test.describe.serial('Project roles', { tag: '@e2e' }, () => {
  const newRoleName = `role-${faker.string.alpha(10).toLowerCase()}`
  let projectName = ''
  let repositoryName = ''
  let environmentName = ''

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const project = await addProject({ page, members: [cnolletUser] })
    projectName = project.name

    repositoryName = await addRandomRepositoryToProject({ page })
    environmentName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })

    await page.getByTestId('test-tab-roles').click()
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newRoleName)
    await page.getByTestId('saveBtn').click()

    await page.getByTestId('test-members').click()
    await page.getByTestId(`input-checkbox-${cnolletUser.id}-cbx`).check({ force: true })
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!projectName)
      return
    const page = await browser.newPage()
    try {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await deleteProject(page, projectName)
    } finally {
      await page.close()
    }
  })

  test('Should not grant perms', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })
    await openProjectByName({ page, projectName })

    await page.getByTestId('test-tab-team').click()
    await expect(page.getByTestId('teamTable').getByText('Retirer du projet')).toBeVisible()
    await expect(page.getByTestId('addUserSuggestionInput')).toHaveCount(0)
    await expect(page.getByTestId('showTransferProjectBtn')).toHaveCount(0)
    await expect(page.getByTestId('test-tab-roles')).toBeVisible()
  })

  test('Should assign view perms', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await openProjectByName({ page, projectName })
    await assignPerms({
      page,
      roleName: newRoleName,
      perms: ['LIST_ENVIRONMENTS', 'LIST_REPOSITORIES'],
    })
  })

  test('Should grant view perms', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })
    await openProjectByName({ page, projectName })
    await page.getByTestId('test-tab-resources').click()

    await expect(page.getByTestId('noReposTr')).toHaveCount(0)
    await expect(page.getByTestId('addRepoLink')).toHaveCount(0)
    await page.getByTestId(`repoTr-${repositoryName}`).click()
    await expect(page.getByTestId('syncRepoBtn')).toHaveCount(0)
    await expect(page.getByTestId('updateRepoBtn')).toHaveCount(0)
    await expect(page.getByTestId('showDeleteRepoBtn')).toHaveCount(0)
    await page.locator('.fr-modal__header > button.fr-btn--close').click()

    await expect(page.getByTestId('noEnvsTr')).toHaveCount(0)
    await expect(page.getByTestId('addEnvironmentLink')).toHaveCount(0)
    await page.getByTestId(`environmentTr-${environmentName}`).click()
    await expect(page.getByTestId('putEnvironmentBtn')).toHaveCount(0)
    await expect(page.getByTestId('showDeleteEnvironmentBtn')).toHaveCount(0)
    await page.locator('.fr-modal__header > button.fr-btn--close').click()

    await page.getByTestId('test-tab-team').click()
    await expect(page.getByTestId('teamTable').getByText('Retirer du projet')).toBeVisible()
    await expect(page.getByTestId('addUserSuggestionInput')).toHaveCount(0)
    await expect(page.getByTestId('showTransferProjectBtn')).toHaveCount(0)

    await page.getByTestId('test-tab-roles').click()
    await expect(page.getByTestId('insuficientPermsRoles')).toBeVisible()
  })
})
