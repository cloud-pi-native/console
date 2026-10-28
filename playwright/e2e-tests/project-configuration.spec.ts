import type { ProjectV2 } from '@cpn-console/shared'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { createProject } from '../helpers/project'

test.describe('Project configuration', { tag: '@e2e' }, () => {
  test('Should configure bounded resources on a limitless project', async ({ page }) => {
    // Arrange - a project created without resources is limitless
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { id: projectId } = await createProject({ page })
    await page.getByTestId('test-tab-configuration').click()
    await expect(page.getByTestId('limitlessProjectSwitch').locator('input')).toBeChecked()
    await expect(page.getByTestId('memoryHprodInput')).not.toBeVisible()

    // Act
    await page.getByTestId('limitlessProjectSwitch').locator('label').click()
    await page.getByTestId('memoryHprodInput').fill('2')
    await page.getByTestId('cpuHprodInput').fill('1')
    await page.getByTestId('gpuHprodInput').fill('0')
    const updateResponse = page.waitForResponse(res =>
      res.request().method() === 'PUT'
      && res.url().includes(`/api/v1/projects/${projectId}`)
      && res.status() === 200)
    await page.getByTestId('saveProjectBtn').click()

    // Assert - the server persisted the bounded quotas, not just the local form state
    const updatedProject = await updateResponse.then(res => res.json()) as ProjectV2
    expect(updatedProject.limitless).toBe(false)
    expect(updatedProject.hprodMemory).toBe(2)
    expect(updatedProject.hprodCpu).toBe(1)
    expect(updatedProject.hprodGpu).toBe(0)
  })
})
