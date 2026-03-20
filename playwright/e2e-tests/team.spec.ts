import { expect, test } from '@playwright/test'

import {
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  testUser,
} from '../config/console'
import { addProject, deleteProject } from './utils'

test.describe('Team view', () => {
  test('should display team members', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page, members: [cnolletUser] })
    try {
      await page.getByTestId('test-tab-team').click()
      await expect(page.getByTestId('teamTable')).toContainText(testUser.email)
      await expect(page.getByTestId('teamTable')).toContainText(cnolletUser.email)
    } finally {
      await deleteProject(page, projectName)
    }
  })

  test('should not add a non-existing team member', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page })
    try {
      await page.getByTestId('test-tab-team').click()
      await page
        .getByTestId('addUserSuggestionInput')
        .locator('input')
        .fill('jenexistepas@criseexistentielle.com')
      await expect(page.getByTestId('addUserBtn')).toBeEnabled()
      await page.getByTestId('addUserBtn').click()
      await expect(page.getByTestId('snackbar')).toContainText(
        'Utilisateur introuvable',
      )
      await expect(
        page.getByRole('cell', { name: 'jenexistepas@criseexistentielle.com' }),
      ).toHaveCount(0)
    } finally {
      await deleteProject(page, projectName)
    }
  })

  test('should add and remove a team member', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page })
    try {
      await page.getByTestId('test-tab-team').click()
      await page
        .getByTestId('addUserSuggestionInput')
        .locator('input')
        .fill(cnolletUser.email)
      await expect(page.getByTestId('addUserBtn')).toBeEnabled()
      await page.getByTestId('addUserBtn').click()
      await expect(page.getByRole('cell', { name: cnolletUser.email })).toBeVisible()

      await page
        .locator(`div[title="Retirer ${cnolletUser.email} du projet"]`)
        .click()
      await expect(page.getByRole('cell', { name: cnolletUser.email })).toHaveCount(0)
    } finally {
      await deleteProject(page, projectName)
    }
  })

  test('should transfer owner role to a team member', { tag: ['@e2e', '@need-rework'] }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page, members: [cnolletUser] })
    try {
      await page.getByTestId('test-tab-team').click()
      await page.getByTestId('showTransferProjectBtn').click()
      await expect(page.getByTestId('transferProjectBtn')).toBeDisabled()
      await page.locator('#nextOwnerSelect').selectOption(cnolletUser.id)
      await expect(page.getByTestId('transferProjectBtn')).toBeEnabled()
      await page.getByTestId('transferProjectBtn').click()

      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: cnolletUser })
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await page.getByTestId('test-tab-team').click()
      await page.getByTestId('showTransferProjectBtn').click()
      await page.locator('#nextOwnerSelect').selectOption(testUser.id)
      await page.getByTestId('transferProjectBtn').click()
    } finally {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await deleteProject(page, projectName)
    }
  })
})
