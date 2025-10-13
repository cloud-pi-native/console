import { expect, test } from '@playwright/test'
import { adminUser, clientURL, signInCloudPiNative } from '../config/console'

import {
  addProject,
  addRandomRepositoryToProject,
  createCluster,
  createStage,
  createZone,
  deleteCluster,
  deleteProject,
  deleteStage,
  deleteZone,
} from '../e2e-tests/utils'

const zonesToDelete: string[] = []
const projectsToDelete: string[] = []
const stagesToDelete: string[] = []
const clustersToDelete: string[] = []

test.describe('Integration tests', { tag: '@integ' }, () => {
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

  test('User flow', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    const project = await addProject({ page })
    const projectName = project.name
    projectsToDelete.push(projectName)
    await addRandomRepositoryToProject({
      page,
      repositoryName: 'tutojava',
      externalRepoUrlInput: 'https://github.com/cloud-pi-native/tuto-java.git',
    })
    // Check if mirror pipeline is successful
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Gitlab' }).click()
    const page1 = await page1Promise
    await page1.getByTestId('group-name').filter({ hasText: 'mirror' }).click()
    await expect(page1.getByTestId('status_success_borderless-icon')).toBeVisible()
    // Run build pipeline and check if it is successful
    await page1.getByRole('link', { name: projectName }).click()
    await page1.getByTestId('group-name').filter({ hasText: 'tutojava' }).click()
    await page1.getByRole('button', { name: 'Build' }).hover()
    await page1.getByRole('link', { name: 'Pipelines' }).click()
    await page1.getByTestId('run-pipeline-button').click()
    await page1.getByTestId('run-pipeline-button').click()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed read_secret' }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed test-app' }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed docker-build', exact: true }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed docker-build-2' }),
    ).toBeVisible()
    // Check if sonar scan is available
    const page2Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'SonarQube' }).click()
    const page2 = await page2Promise
    await page2.getByRole('button', { name: 'OpenID Connect Log in with' }).click()
    await page2.getByPlaceholder('Search for projects...').fill(projectName)
    await page2.getByRole('link', { name: `${projectName}-tutojava` }).click()
    await expect(
      page2.getByTestId('overview__quality-gate-panel').getByText('Passed', { exact: true }),
    ).toBeVisible()
  })

  test('Cleanup user test data', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    for (const projectName of projectsToDelete) {
      await deleteProject(page, projectName)
    }
    console.log('Projects:', projectsToDelete)
  })
})
