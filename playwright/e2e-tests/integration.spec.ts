import { test } from '@playwright/test'
import { adminUser, clientURL, signInCloudPiNative } from '../config/console'

import {
  createCluster,
  // createProject,
  createStage,
  createZone,
  deleteCluster,
  deleteProject,
  deleteStage,
  deleteZone,
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

  test('Cleanup test data', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    for (const projectName of projectsToDelete) {
      await deleteProject(page, projectName)
    }
    console.log('Projects:', projectsToDelete)
    for (const stageName of stagesToDelete) {
      await deleteStage(page, stageName)
    }
    console.log('Stages:', stagesToDelete)
    for (const clusterName of clustersToDelete) {
      await deleteCluster(page, clusterName)
    }
    console.log('Clusters:', clustersToDelete)
    for (const zoneName of zonesToDelete) {
      await deleteZone(page, zoneName)
    }
    console.log('Zones:', zonesToDelete)
  })
})
