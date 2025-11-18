import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'
import { faker } from '@faker-js/faker'

test.describe('Admin Tokens page', () => {
  // @TODO The original test did actually test whether the generated token worked.
  // Add a dedicated test to do exactly that.
  test(
    'Should create tokens, when logged in as an admin',
    { tag: ['@e2e', '@need-rework'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: tcolinUser })
      const tokenName = faker.string.alpha(10).toLowerCase()

      // Act
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationToken').click()
      await page.getByTestId('showNewTokenFormBtn').click()

      await page.getByTestId('newTokenName').fill(tokenName)
      await page.getByTestId('saveBtn').click()

      // Assert
      await expect(page.getByTestId('newTokenPassword')).toBeVisible()
      // Reinit form should hide newly generated password
      await page.getByTestId('showNewTokenFormBtn').click()
      await expect(page.getByTestId('newTokenPassword')).not.toBeVisible()

      await expect(page.getByTestId('tokenTable')).toContainText(tokenName)
    },
  )

  // @TODO Add token deletion test (the original one used "nth" which is not reliable)
})
