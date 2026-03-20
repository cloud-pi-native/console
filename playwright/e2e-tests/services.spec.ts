import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { addProject, deleteProject } from './utils'

test.describe('Services view', () => {
  test('should display service config for a project', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    const { name: projectName } = await addProject({ page })
    try {
      await page.getByTestId('test-tab-services').click()
      await expect(page.locator('#servicesTable')).toBeVisible()

      await expect(page.getByTestId('service-config-argocd')).toBeVisible()
      await page.getByTestId('service-config-argocd').click()
      await expect(
        page.getByTestId('service-project-config-argocd').locator('input'),
      ).toHaveCount(1)
    } finally {
      await deleteProject(page, projectName)
    }
  })
})
