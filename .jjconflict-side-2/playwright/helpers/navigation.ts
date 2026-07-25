import type { Page } from '@playwright/test'

export async function openMyProjects({ page }: { page: Page }) {
  await page.getByTestId('menuMyProjects').click()
}

async function ensureAdminMenuVisible(page: Page, menuTestId: string) {
  const menuItem = page.getByTestId(menuTestId)
  if (!(await menuItem.isVisible()))
    await page.getByTestId('menuAdministrationBtn').click()
}

export async function openClustersAdministration({ page }: { page: Page }) {
  await ensureAdminMenuVisible(page, 'menuAdministrationClusters')
  await page.getByTestId('menuAdministrationClusters').click()
}

export async function openStagesAdministration({ page }: { page: Page }) {
  await ensureAdminMenuVisible(page, 'menuAdministrationStages')
  await page.getByTestId('menuAdministrationStages').click()
}

export async function openZonesAdministration({ page }: { page: Page }) {
  await ensureAdminMenuVisible(page, 'menuAdministrationZones')
  await page.getByTestId('menuAdministrationZones').click()
}
