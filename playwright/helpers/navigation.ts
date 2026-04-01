import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function openMyProjects(page: Page) {
  await page.getByTestId('menuMyProjects').click()
}

async function ensureAdminMenuVisible(page: Page, menuTestId: string) {
  const menuItem = page.getByTestId(menuTestId)
  await menuItem
    .isVisible()
    .then(visible =>
      visible ? Promise.resolve() : page.getByTestId('menuAdministrationBtn').click(),
    )
}

export async function openClustersAdministration(page: Page) {
  await ensureAdminMenuVisible(page, 'menuAdministrationClusters')
  await page.getByTestId('menuAdministrationClusters').click()
  await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
}

export async function openStagesAdministration(page: Page) {
  await ensureAdminMenuVisible(page, 'menuAdministrationStages')
  await page.getByTestId('menuAdministrationStages').click()
}

export async function openZonesAdministration(page: Page) {
  await ensureAdminMenuVisible(page, 'menuAdministrationZones')
  await page.getByTestId('menuAdministrationZones').click()
}
