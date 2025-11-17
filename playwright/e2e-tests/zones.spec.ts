import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'
import { faker } from '@faker-js/faker'
import { deleteValidationInput } from './utils'

test.describe('Zone page', () => {
  // @TODO: Add clusters to this test to ensure this part of the feature
  test('Should create a zone', { tag: ['@e2e', '@need-rework'] }, async ({ page }) => {
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

  test('Should not create a zone if slug is already taken', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const zone = {
      slug: faker.string.alpha(10).toLowerCase(),
      label: 'Zone à Défendre',
      argocdUrl: 'https://vousetesici.fr',
      description: 'Il faut défendre cette zone.',
    }
    // Create the zone
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationZones').click()
    await page.getByTestId('createZoneLink').click()
    await page.getByTestId('slugInput').fill(zone.slug)
    await page.getByTestId('labelInput').fill(zone.label)
    await page.getByTestId('argocdUrlInput').fill(zone.argocdUrl)
    await page.getByTestId('descriptionInput').fill(zone.description)
    await page.getByTestId('addZoneBtn').click()

    // Act - attempt to create a zone with the same slug
    await page.getByTestId('menuAdministrationZones').click()
    await page.getByTestId('createZoneLink').click()
    await page.getByTestId('slugInput').fill(zone.slug)
    await page.getByTestId('labelInput').fill(`${zone.label}bis`)
    await page.getByTestId('argocdUrlInput').fill(`${zone.argocdUrl}bis`)
    await page.getByTestId('descriptionInput').fill(`${zone.description}bis`)
    await page.getByTestId('addZoneBtn').click()

    // Assert
    await expect(page.getByTestId('snackbar')).toContainText(`Une zone portant le nom ${zone.slug} existe déjà.`)
  })

  test('Should not delete a zone if associated clusters', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    // No data to arrange, a public zone is present by default (I guess ?)

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationZones').click()

    // Assert
    await page.getByTestId(`zoneTile-publique`).click()
    await expect(page.getByTestId('showDeleteZoneBtn')).not.toBeVisible()
    await expect(page.getByTestId('associatedClustersAlert')).toBeVisible()
  })

  test('Should delete a zone', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const zone = {
      slug: faker.string.alpha(10).toLowerCase(),
      label: 'Zone à Défendre',
      argocdUrl: 'https://vousetesici.fr',
      description: 'Il faut défendre cette zone.',
    }
    // Create the zone
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationZones').click()
    await page.getByTestId('createZoneLink').click()
    await page.getByTestId('slugInput').fill(zone.slug)
    await page.getByTestId('labelInput').fill(zone.label)
    await page.getByTestId('argocdUrlInput').fill(zone.argocdUrl)
    await page.getByTestId('descriptionInput').fill(zone.description)
    await page.getByTestId('addZoneBtn').click()
    // @TODO: Add clusters to this test to ensure we can't delete a zone that has clusters

    // Act
    await page.getByTestId('menuAdministrationZones').click()
    await page.locator(`#zoneTile-${zone.slug}`).click()
    await page.getByTestId('showDeleteZoneBtn').click()
    await page.getByTestId('deleteZoneInput').fill(deleteValidationInput)
    await page.getByTestId('deleteZoneBtn').click()

    // Assert
    await page.getByTestId('menuAdministrationZones').click()
    await expect(page.locator(`#zoneTile-${zone.slug}`)).not.toBeVisible()
  })
})
