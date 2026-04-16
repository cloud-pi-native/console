import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { clientURL, cnolletUser, signInCloudPiNative, testUser } from '../config/console'
import { createEnvironment } from '../helpers/environment'
import { createProject, deleteProject } from '../helpers/project'
import { createRepository } from '../helpers/repository'

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
  const setPermChecked = async (key: string, checked: boolean) => {
    const input = page.locator(`#${key}-cbx`)
    await expect(input).toBeVisible()
    if ((await input.isChecked()) === checked)
      return

    const label = page.locator(`label[for="${key}-cbx"]`)
    if (await label.count()) {
      await label.click()
    } else {
      await input.click({ force: true })
    }

    try {
      await expect(input).toBeChecked({ checked })
    } catch {
      await input.evaluate((el: HTMLInputElement, nextChecked: boolean) => {
        el.checked = nextChecked
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }, checked)
      await expect(input).toBeChecked({ checked })
    }
  }

  for (const key of perms) {
    await setPermChecked(key, true)
  }
  await expect(page.getByTestId('saveBtn')).toBeEnabled()
  await page.getByTestId('saveBtn').click()
  await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')
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

    const project = await createProject({ page, members: [cnolletUser] })
    projectName = project.name

    repositoryName = await createRepository({ page })
    environmentName = await createEnvironment({
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

    await page.getByRole('tab', { name: 'Membres' }).click()
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
      await deleteProject({ page, projectName })
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

  test('System roles forbid edits', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await openProjectByName({ page, projectName })

    await openProjectRoleByName({ page, roleName: 'DevOps' })

    await expect(page.getByTestId('roleNameInput')).toBeDisabled()
    await expect(page.locator('#LIST_ENVIRONMENTS-cbx')).toBeDisabled()
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('deleteBtn')).toHaveCount(0)
  })

  test('System roles allow member assignment', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await openProjectByName({ page, projectName })
    await openProjectRoleByName({ page, roleName: 'DevOps' })

    const membersTab = page.getByRole('tab', { name: 'Membres' })
    await expect(membersTab).toBeVisible()
    await membersTab.click()
    const memberCheckbox = page.getByTestId(`input-checkbox-${cnolletUser.id}-cbx`)
    await expect(memberCheckbox).toBeVisible()
    const wasChecked = await memberCheckbox.isChecked()
    await memberCheckbox.setChecked(!wasChecked, { force: true })
    await expect(memberCheckbox).toBeChecked({ checked: !wasChecked })
    await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')

    await memberCheckbox.setChecked(wasChecked, { force: true })
    await expect(memberCheckbox).toBeChecked({ checked: wasChecked })
    await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')
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
    await expect(page.getByTestId('addRepoLink')).toBeHidden()
    await page.getByTestId(`repoTr-${repositoryName}`).click()
    await expect(page.getByTestId('syncRepoBtn')).toHaveCount(0)
    await expect(page.getByTestId('updateRepoBtn')).toHaveCount(0)
    await expect(page.getByTestId('showDeleteRepoBtn')).toHaveCount(0)
    await page.locator('.fr-modal__header > button.fr-btn--close').click()

    await expect(page.getByTestId('noEnvsTr')).toHaveCount(0)
    await expect(page.getByTestId('addEnvironmentLink')).toBeHidden()
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
