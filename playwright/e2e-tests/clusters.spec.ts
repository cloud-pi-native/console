import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

import { adminUser, clientURL, signInCloudPiNative } from './utils'

test.describe('Clusters page', () => {
  test('should create a cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
  })

  test('should create a cluster even if given informations is longer than 200 chars but shorter than 1001 chars', async ({
    page,
  }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    const informations = faker.string.alpha(1000).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('infosInput').fill(informations)
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(
      page.getByRole('cell', {
        name: clusterName,
      }),
    ).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await expect(page.getByTestId('infosInput')).toHaveValue(informations)
  })

  test('should NOT create a cluster even if given informations is longer than 1000 chars', async ({
    page,
  }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    const informations = faker.string.alpha(1001).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('infosInput').fill(informations)
    await expect(page.getByTestId('addClusterBtn')).toBeDisabled()
  })
})
