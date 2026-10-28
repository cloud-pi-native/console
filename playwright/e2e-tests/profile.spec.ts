import { expect, test } from '@playwright/test'

import {
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  tcolinUser,
} from '../config/console'

test.describe('Profile page', { tag: '@e2e' }, () => {
  test('should display name once logged', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })

    // Assert
    await expect(page.getByTestId('menuUserList')).toContainText(
      `${cnolletUser.firstName} ${cnolletUser.lastName}`,
    )
  })

  test('should display profile infos', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    await page.goto(`${clientURL}/profile/info`)

    // Assert
    const locator = page.getByTestId('profileInfos')
    await expect(locator).toContainText(
      `${tcolinUser.lastName}, ${tcolinUser.firstName}`,
    )
    await expect(locator).toContainText(tcolinUser.id)
    await expect(locator).toContainText('Admin')
    await expect(locator).toContainText(tcolinUser.email)
  })

  test('should create a PAT', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    await page.goto(`${clientURL}/profile/tokens`)

    // Act
    await page.getByTestId('showNewTokenFormBtn').click()
    await page.getByTestId('newTokenName').fill('test2')
    await page.getByTestId('expirationDateInput').fill('2100-11-22')
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('newTokenPassword')).toBeVisible()
    await page.getByTestId('showNewTokenFormBtn').click()

    // Assert
    const locator = page.locator('tr', { hasText: 'test2' })
    await expect(locator).toContainText(new Date().getFullYear().toString())
    await expect(locator).toContainText('2100')
    await expect(locator).toContainText('Jamais')
    await expect(locator).toContainText('Actif')
    await locator.getByTitle('Supprimer').click()
    await page.getByTestId('confirmDeletionBtn').click()
    await expect(page.getByTestId('tokenTable')).toContainText(
      'Aucune clé d\'api existante',
    )
  })
})
