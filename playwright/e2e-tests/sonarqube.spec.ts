import { test, expect } from '@playwright/test'
import { loadSonarqubeConfig } from '../config/sonarqube'

const sonarConfig = loadSonarqubeConfig()

test.describe('Sonarqube Tests', () => {
  test.beforeEach({ tag: '@integ' }, async ({ page }) => {
    await page.goto(sonarConfig.url)
    await expect(
      page.getByRole('button', { name: /Log in with OpenID Connect/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Log in with OpenID Connect' }).click()
    await expect(page.locator('#kc-form-login')).toBeVisible()
    await page.getByLabel('Username or email').fill(sonarConfig.adminUser)
    await page.getByLabel('Password').fill(sonarConfig.adminPass)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByRole('img', { name: 'layout.nav.home_sonarqube_logo_alt' }))
      .toBeVisible()
  })

  test('should have access to project', { tag: '@integ' }, async ({ page }) => {
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(
      page.getByRole('button', { name: 'Create Project' }),
    ).toBeVisible()
  })
})
