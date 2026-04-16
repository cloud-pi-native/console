import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { deleteValidationInput } from './constants'
import { openZonesAdministration } from './navigation'

async function openZoneCreateForm(page: Page) {
  await page.getByTestId('createZoneLink').click()
}

async function fillZoneCreateForm(page: Page, zoneName: string) {
  await page.getByTestId('slugInput').fill(zoneName)
  await page.getByTestId('labelInput').fill(zoneName)
  await page.getByTestId('argocdUrlInput').fill(faker.internet.url())
  await page
    .getByTestId('descriptionInput')
    .fill(faker.string.alpha(100).toLowerCase())
}

export async function createZone({ page }: { page: Page }): Promise<string> {
  const zoneName = faker.string.alpha(10).toLowerCase()
  await openZonesAdministration({ page })
  await openZoneCreateForm(page)
  await fillZoneCreateForm(page, zoneName)
  await page.getByTestId('addZoneBtn').click()
  return zoneName
}

export async function deleteZone({ page, zoneName }: { page: Page, zoneName: string }) {
  await openZonesAdministration({ page })
  await page.getByRole('link', { name: zoneName }).click()
  await page.getByTestId('showDeleteZoneBtn').click()
  await page.getByTestId('deleteZoneInput').fill(deleteValidationInput)
  await page.getByTestId('deleteZoneBtn').click()
}
