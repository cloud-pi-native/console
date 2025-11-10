import { expect, test } from '@playwright/test'

import {
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  tcolinUser,
} from '../config/console'

test.describe('Profile page', () => {
  test('Should display name once logged', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })

    await expect(page.getByTestId('menuUserList')).toContainText(
      `${cnolletUser.firstName} ${cnolletUser.lastName}`,
    )
  })

  test('Should display profile infos', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    await page.goto(`${clientURL}/profile/info`)

    const locator = expect(page.getByTestId('profileInfos'))
    await locator.toContainText(
      `${tcolinUser.lastName}, ${tcolinUser.firstName}`,
    )
    await locator.toContainText(tcolinUser.id)
    await locator.toContainText('Admin')
    await locator.toContainText(tcolinUser.email)
  })

  test('Should create a PAT', { tag: '@e2e' }, async ({ page }) => {
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
    expect(page.getByTestId('newTokenPassword')).toBeDefined()
    const locator = page.locator('tr', { hasText: 'test2' })
    expect(locator).toContainText(new Date().getFullYear().toString())
    expect(locator).toContainText('2100')
    expect(locator).toContainText('Jamais')
    expect(locator).toContainText('Actif')
    await locator.getByTitle('Supprimer').click()
    await page.getByTestId('confirmDeletionBtn').click()
    await page
      .getByRole('cell', { name: 'Aucune clé d\'api existante' })
      .click()
  })
})
