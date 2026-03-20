import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { deleteProjectBySlug } from './utils'

test.describe('Create Project', () => {
  test('should validate name and create a project with minimal form infos', { tag: '@e2e' }, async ({ page }) => {
    const projectName = `project${Date.now()}`

    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()

    await expect(page.locator('h1')).toContainText('Commander un espace projet')

    await page.getByTestId('nameInput').fill(`${projectName} ErrorSpace`)
    await expect(page.getByTestId('nameInput')).toHaveClass(/fr-input--error/)
    await expect(page.getByTestId('createProjectBtn')).toBeDisabled()

    await page.getByTestId('nameInput').fill(projectName)
    await expect(page.getByTestId('nameInput')).not.toHaveClass(/fr-input--error/)
    await expect(page.getByTestId('createProjectBtn')).toBeEnabled()

    await page.getByTestId('descriptionInput').fill(
      'Application de prise de rendez-vous en préfécture.',
    )
    await page.getByTestId('createProjectBtn').click()

    await expect(page.locator('h1')).toContainText(projectName)
    expect(page.url()).toContain(`/projects/${projectName}`)

    const slug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )
    if (slug) {
      await deleteProjectBySlug(page, slug)
    }
  })

  test('should suffix slug when project name is already taken', { tag: '@e2e' }, async ({ page }) => {
    const projectName = `dupe${Date.now()}`

    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()
    await page.getByTestId('nameInput').fill(projectName)
    await page.getByTestId('createProjectBtn').click()
    await expect(page.locator('h1')).toContainText(projectName)
    const firstSlug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )

    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()
    await page.getByTestId('nameInput').fill(projectName)
    await page.getByTestId('createProjectBtn').click()
    await expect(page.locator('h1')).toContainText(projectName)
    const secondSlug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )

    expect(firstSlug).toBeDefined()
    expect(secondSlug).toBeDefined()
    expect(secondSlug).not.toEqual(firstSlug)
    expect(secondSlug).toContain(`${projectName}-`)

    if (firstSlug) await deleteProjectBySlug(page, firstSlug)
    if (secondSlug) await deleteProjectBySlug(page, secondSlug)
  })
})
