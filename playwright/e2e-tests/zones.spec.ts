import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'
import { faker } from '@faker-js/faker'

test.describe('Zone page', () => {
  test('Should create a zone', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const zone = {
      slug: faker.string.alpha(10).toLowerCase(),
      label: 'Zone à Défendre',
      argocdUrl: 'https://vousetesici.fr',
      description: 'Il faut défendre cette zone.',
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationZones').click()
    await page.getByTestId('createZoneLink').click()
    await page.getByTestId('slugInput').fill(zone.slug)
    await page.getByTestId('labelInput').fill(zone.label)
    await page.getByTestId('argocdUrlInput').fill(zone.argocdUrl)
    await page.getByTestId('descriptionInput').fill(zone.description)
    expect(expect(page.locator('#clusters-select')).not.toBeVisible())
    await page.getByTestId('addZoneBtn').click()

    await page.reload()

    // Assert
    await page.locator(`#zoneTile-${zone.slug}`).click()
    await expect(page.getByTestId('slugInput')).toHaveValue(zone.slug)
    await expect(page.getByTestId('slugInput')).toBeDisabled()
    await expect(page.getByTestId('labelInput')).toHaveValue(zone.label)
    await expect(page.getByTestId('labelInput')).toBeEnabled()
    await expect(page.getByTestId('argocdUrlInput')).toHaveValue(
      zone.argocdUrl,
    )
    await expect(page.getByTestId('argocdUrlInput')).toBeEnabled()
    await expect(page.getByTestId('descriptionInput')).toHaveValue(
      zone.description,
    )
    await expect(page.getByTestId('descriptionInput')).toBeEnabled()
    await expect(page.locator('#clusters-select')).toBeVisible()
    await expect(page.locator('#clusters-select')).toHaveAttribute(
      'disabled',
      'true',
    )
    await expect(page.getByTestId('updateZoneBtn')).toBeEnabled()
  })

  test('Should update a zone', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const zone = {
      slug: faker.string.alpha(10).toLowerCase(),
      label: 'Zone à Défendre',
      argocdUrl: 'https://vousetesici.fr',
      description: 'Il faut défendre cette zone.',
    }
    const updatedZone = {
      label: 'Zone Mise à Jour',
      argocdUrl: 'https://vousnetesplusici.fr',
      description: 'Cette zone a été mise à jour.',
    }
    // Zone creation (for later update)
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationZones').click()
    await page.getByTestId('createZoneLink').click()
    await page.getByTestId('slugInput').fill(zone.slug)
    await page.getByTestId('labelInput').fill(zone.label)
    await page.getByTestId('argocdUrlInput').fill(zone.argocdUrl)
    await page.getByTestId('descriptionInput').fill(zone.description)
    await page.getByTestId('addZoneBtn').click()

    // Act
    await page.locator(`#zoneTile-${zone.slug}`).click()
    await page.getByTestId('labelInput').fill(updatedZone.label)
    await page.getByTestId('argocdUrlInput').fill(updatedZone.argocdUrl)
    await page.getByTestId('descriptionInput').fill(updatedZone.description)
    await page.getByTestId('updateZoneBtn').click()

    // Assert
    await page.locator(`#zoneTile-${zone.slug}`).click()
    await expect(page.getByTestId('slugInput')).toHaveValue(zone.slug)
    await expect(page.getByTestId('slugInput')).toBeDisabled()
    await expect(page.getByTestId('labelInput')).toHaveValue(updatedZone.label)
    await expect(page.getByTestId('labelInput')).toBeEnabled()
    await expect(page.getByTestId('argocdUrlInput')).toHaveValue(
      updatedZone.argocdUrl,
    )
    await expect(page.getByTestId('argocdUrlInput')).toBeEnabled()
    await expect(page.getByTestId('descriptionInput')).toHaveValue(
      updatedZone.description,
    )
    await expect(page.getByTestId('descriptionInput')).toBeEnabled()
    await expect(page.locator('#clusters-select')).toBeVisible()
    await expect(page.locator('#clusters-select')).toHaveAttribute(
      'disabled',
      'true',
    )
    await expect(page.getByTestId('updateZoneBtn')).toBeEnabled()
  })
})
