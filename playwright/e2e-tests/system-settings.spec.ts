import { expect, test } from '@playwright/test'

import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from '../config/console'

test.describe('Admin - System settings', () => {
  test('should toggle maintenance mode', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationSystemSettings').click()
    await expect(page.locator('h1')).toContainText('Réglages de la console Cloud π Native')

    const maintenanceToggle = page.getByTestId('toggle-maintenance')
    await expect(maintenanceToggle).toBeVisible()

    await maintenanceToggle.click()

    await page.goto('/projects')
    await expect(page.getByTestId('maintenance-notice')).toBeVisible()

    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: testUser })
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/maintenance$/)
    await expect(page.getByTestId('contact-us')).toBeVisible()

    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationSystemSettings').click()
    await maintenanceToggle.click()

    await page.goto('/projects')
    await expect(page.getByTestId('maintenance-notice')).toHaveCount(0)
  })
})
