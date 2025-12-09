import { test } from '@playwright/test'
import { adminUser, clientURL, signInCloudPiNative } from '../config/console'

import {
  createCluster,
  createStage,
  createZone,
  deleteCluster,
  deleteStage,
  deleteZone,
} from '../e2e-tests/utils'

const zonesToDelete: string[] = []
const stagesToDelete: string[] = []
const clustersToDelete: string[] = []

test.describe('Integration tests for admin', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

  test('Admin setup', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    const zoneName = await createZone({ page })
    zonesToDelete.push(zoneName)
    // we need to attains 7 stages to be able to use associateStageNames argument in createCluster
    await page.getByRole('link', { name: 'Console Cloud π Native' }).click()
    const customStageName1 = await createStage({ page, check: true, stagesToDelete })
    await page.getByRole('link', { name: 'Console Cloud π Native' }).click()
    const customStageName2 = await createStage({ page, check: true, stagesToDelete })
    await page.getByRole('link', { name: 'Console Cloud π Native' }).click()
    const customStageName3 = await createStage({ page, check: true, stagesToDelete })
    stagesToDelete.push(customStageName1)
    stagesToDelete.push(customStageName2)
    stagesToDelete.push(customStageName3)
    const clusterName = await createCluster({
      page,
      zone: zoneName,
      confidentiality: 'public',
      associateStageNames: [customStageName1, customStageName2, customStageName3],
    })
    clustersToDelete.push(clusterName)
  })

  test('Cleanup admin test data', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    for (const stageName of stagesToDelete) {
      await deleteStage(page, stageName)
    }
    for (const clusterName of clustersToDelete) {
      await deleteCluster(page, clusterName)
    }
    for (const zoneName of zonesToDelete) {
      await deleteZone(page, zoneName)
    }
  })
})
