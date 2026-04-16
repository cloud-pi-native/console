import type { Page } from '@playwright/test'
import type { Credentials } from '../config/console'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { deleteValidationInput, projectReadinessTimeoutMs } from './constants'
import { openMyProjects } from './navigation'

const projectUrlRegexp = /\/projects\/[^/]+$/
const projectSlugPrefixRegexp = /^slug\s*:\s*/i

interface Resources {
  cpu: number
  gpu: number
  memory: number
}

async function openProjectCreateForm(page: Page) {
  await openMyProjects({ page })
  await page.getByTestId('createProjectLink').click()
}

async function fillProjectName(page: Page, name: string) {
  await page.getByTestId('nameInput').click()
  await page.getByTestId('nameInput').fill(name)
}

async function fillProjectResources({
  page,
  hprodResources,
  prodResources,
}: {
  page: Page
  hprodResources?: Resources
  prodResources?: Resources
}) {
  const fillHprod = async (resources: Resources) => {
    await page.getByTestId('cpuHprodInput').fill(resources.cpu.toString())
    await page.getByTestId('gpuHprodInput').fill(resources.gpu.toString())
    await page
      .getByTestId('memoryHprodInput')
      .fill(resources.memory.toString())
  }
  const fillProd = async (resources: Resources) => {
    await page.getByTestId('cpuProdInput').fill(resources.cpu.toString())
    await page.getByTestId('gpuProdInput').fill(resources.gpu.toString())
    await page
      .getByTestId('memoryProdInput')
      .fill(resources.memory.toString())
  }

  if (hprodResources)
    await fillHprod(hprodResources)
  if (prodResources)
    await fillProd(prodResources)
}

async function enableProjectLimitless(page: Page) {
  await page.getByTestId('limitlessProjectSwitch').locator('label').click()
}

async function addMembersToProject(page: Page, members: Credentials[]) {
  await page.getByTestId('test-tab-team').click()
  for (const member of members) {
    await page
      .getByRole('combobox', { name: 'Ajouter un utilisateur' })
      .fill(member.email)
    await page.getByTestId('addUserBtn').click()
    await expect(
      page.getByTestId('teamTable').getByText(member.email),
    ).toBeVisible()
  }
  await page.getByTestId('test-tab-resources').click()
}

async function getProjectSlugAndId(page: Page) {
  const rawSlugText = (await page.getByTestId('project-slug').textContent()) ?? 'no-slug'
  const slug = rawSlugText?.replace(projectSlugPrefixRegexp, '').trim()
  const id = (await page.getByTestId('project-id').getAttribute('title')) ?? 'no-id'
  return { slug, id }
}

export async function createProject({
  page,
  projectName: name,
  members,
  hprodResources,
  prodResources,
}: {
  page: Page
  projectName?: string
  members?: Credentials[]
  hprodResources?: Resources
  prodResources?: Resources
}): Promise<{ id: string, slug: string, name: string }> {
  name = name ?? faker.string.alpha(10).toLowerCase()
  await openProjectCreateForm(page)
  await fillProjectName(page, name)
  await fillProjectResources({ page, hprodResources, prodResources })
  if (!hprodResources && !prodResources) await enableProjectLimitless(page)

  await page.getByTestId('createProjectBtn').click()
  await expect(page).toHaveURL(projectUrlRegexp, { timeout: projectReadinessTimeoutMs })
  await expect(page.getByTestId('project-slug')).toBeVisible({ timeout: projectReadinessTimeoutMs })
  if (members?.length)
    await addMembersToProject(page, members)

  const { slug, id } = await getProjectSlugAndId(page)
  return { name, slug, id }
}

export async function deleteProject({ page, projectName }: { page: Page, projectName: string }) {
  await openMyProjects({ page })
  await page.getByRole('link', { name: projectName }).click()
  await page.getByRole('button', { name: 'Supprimer le projet' }).click()
  await page.getByTestId('archiveProjectInput').fill(deleteValidationInput)
  await page.getByTestId('confirmDeletionBtn').click()
  await openMyProjects({ page })
  await expect(page.getByRole('link', { name: projectName })).not.toBeVisible()
}
