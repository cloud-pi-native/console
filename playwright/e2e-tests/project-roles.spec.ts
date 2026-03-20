import { expect, test } from '@playwright/test'

import {
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  testUser,
} from '../config/console'
import { addProject, deleteProject } from './utils'

test.describe('Project roles', () => {
  test('should create a role, rename it, and assign a member', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page, members: [cnolletUser] })

    try {
      await page.getByTestId('test-tab-roles').click()
      await expect(page.getByTestId('addRoleBtn')).toBeEnabled()
      await page.getByTestId('addRoleBtn').click()
      await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')

      await expect(page.getByTestId('saveBtn')).toBeDisabled()
      await page.getByTestId('roleNameInput').fill('elo hell')
      await expect(page.getByTestId('saveBtn')).toBeEnabled()
      await page.getByTestId('saveBtn').click()

      await page.getByTestId('test-members').click()
      await page.locator(`input#${cnolletUser.id}-cbx`).check({ force: true })
      await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')
    } finally {
      await deleteProject(page, projectName)
    }
  })

  test('should not grant manage permissions by default', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page, members: [cnolletUser] })

    try {
      await page.getByTestId('test-tab-roles').click()
      await page.getByTestId('addRoleBtn').click()
      await page.getByTestId('roleNameInput').fill('default role')
      await page.getByTestId('saveBtn').click()
      await page.getByTestId('test-members').click()
      await page.locator(`input#${cnolletUser.id}-cbx`).check({ force: true })

      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: cnolletUser })
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()

      await page.getByTestId('test-tab-team').click()
      await expect(page.getByTestId('addUserSuggestionInput')).toHaveCount(0)
      await expect(page.getByTestId('showTransferProjectBtn')).toHaveCount(0)
      await expect(page.getByTestId('replayHooksBtn')).toHaveCount(0)
      await expect(page.getByTestId('showSecretsBtn')).toHaveCount(0)
      await expect(page.getByTestId('test-tab-roles')).toBeVisible()
    } finally {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await deleteProject(page, projectName)
    }
  })
})
