import { test } from '@playwright/test'

import {
  adminUser,
  clientURL,
  createCluster,
  // createProject,
  createStage,
  createZone,
  deleteCluster,
  deleteProject,
  deleteStage,
  deleteZone,
  signInCloudPiNative,
} from './utils'

const zonesToDelete: string[] = []
const projectsToDelete: string[] = []
const stagesToDelete: string[] = []
const clustersToDelete: string[] = []

test.describe('Integration tests', { tag: '@integ' }, () => {
  test('Admin setup', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    const zoneName = await createZone(page)
    zonesToDelete.push(zoneName)
    await page.getByRole('link', { name: 'Console Cloud π Native' }).click()
    const customStageName = await createStage({ page, check: true, stagesToDelete })
    stagesToDelete.push(customStageName)
    const clusterName = await createCluster({
      page,
      zone: 'publique',
      confidentiality: 'public',
      associateStageNames: customStageName,
    })
    clustersToDelete.push(clusterName)
  })

  test('Cleanup test data', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    for (const projectName of projectsToDelete) {
      await deleteProject(page, projectName)
    }
    for (const stageName of stagesToDelete) {
      await deleteStage(page, stageName)
    }
    for (const clusterName of clustersToDelete) {
      await deleteCluster({ page, clusterName })
    }
    for (const zoneName of zonesToDelete) {
      await deleteZone({ page, zoneName })
    }
  })
})
