import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { deleteValidationInput } from './constants'
import { openZonesAdministration } from './navigation'

export interface ZoneInfos {
  slug: string
  label: string
  argocdUrl: string
  description: string
}

async function openZoneCreateForm(page: Page) {
  await page.getByTestId('createZoneLink').click()
}

function fakeZone(): ZoneInfos {
  return {
    slug: faker.string.alpha(10).toLowerCase(),
    label: faker.string.alpha(10),
    argocdUrl: faker.internet.url(),
    description: faker.string.alpha(100).toLowerCase(),
  }
}

export async function createZone({
  page,
  zone,
}: {
  page: Page
  zone?: ZoneInfos
}): Promise<ZoneInfos> {
  zone = zone ?? fakeZone()
  await openZonesAdministration({ page })
  await openZoneCreateForm(page)
  await page.getByTestId('slugInput').fill(zone.slug)
  await page.getByTestId('labelInput').fill(zone.label)
  await page.getByTestId('argocdUrlInput').fill(zone.argocdUrl)
  await page.getByTestId('descriptionInput').fill(zone.description)
  await page.getByTestId('addZoneBtn').click()
  return zone
}

export async function deleteZone({ page, zoneName }: { page: Page, zoneName: string }) {
  await openZonesAdministration({ page })
  await page.locator(`#zoneTile-${zoneName}`).click()
  await page.getByTestId('showDeleteZoneBtn').click()
  await page.getByTestId('deleteZoneInput').fill(deleteValidationInput)
  await page.getByTestId('deleteZoneBtn').click()
}
