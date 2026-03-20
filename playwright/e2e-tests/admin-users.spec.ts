import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

test.describe('Admin - Users', () => {
  test('should list users and allow filtering', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationUsers').click()

    await expect(page.locator('h2')).toContainText('Liste des utilisateurs')
    const usersTable = page.getByTestId('tableAdministrationUsers')
    await expect(usersTable).toBeVisible()

    const firstUserRow = usersTable.locator('tr[data-testid^="user-"]').first()
    await expect(firstUserRow).toBeVisible()

    const firstUserId = (await firstUserRow.getAttribute('data-testid'))?.replace(
      'user-',
      '',
    )
    expect(firstUserId).toBeTruthy()

    const idCodeInRow = firstUserRow
      .locator('code')
      .filter({ hasText: firstUserId as string })

    await expect(
      idCodeInRow,
    ).toHaveCount(0)

    await page.locator('input#tableAdministrationUsersDisplayId').check({ force: true })
    await expect(
      idCodeInRow,
    ).toHaveCount(1)

    await page.getByTestId('tableAdministrationUsersSearch').fill(firstUserId as string)
    await expect(usersTable.locator('tr[data-testid^="user-"]')).toHaveCount(1)

    await page.getByTestId('tableAdministrationUsersSearch').fill('')
    await page.locator('input#tableAdministrationUsersHideBots').check({ force: true })
    await expect(usersTable.locator('tr[data-testid^="user-"]')).not.toHaveCount(0)
  })
})
