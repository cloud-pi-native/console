import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { setCheckbox } from './checkbox'
import { openRolesAdministration } from './navigation'

export interface RoleInfos {
  name: string
  oidcGroupName?: string
  managePerm?: boolean
}

export async function createAdminRole({ page, role }: { page: Page, role: RoleInfos }): Promise<string> {
  await openRolesAdministration({ page })
  await expect(page.getByTestId('role-list')).not.toContainText(role.name)
  await page.getByTestId('addRoleBtn').click()
  await expect(
    page.getByTestId('snackbar').filter({ hasText: 'Rôle ajouté' }).first(),
  ).toBeVisible()
  await expect(page.getByTestId('saveBtn')).toBeDisabled()
  await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
  await page.getByTestId('roleNameInput').fill(role.name)
  if (role.oidcGroupName)
    await page.getByTestId('oidcGroupInput').fill(role.oidcGroupName)
  if (role.managePerm)
    await setCheckbox(page.locator('input[name=MANAGE]'))
  await page.getByTestId('saveBtn').click()
  await expect(page.getByTestId('role-list')).toContainText(role.name)
  return role.name
}

export async function addUserToAdminRole({
  page,
  userEmail,
}: {
  page: Page
  userEmail: string
}) {
  await page.getByTestId('test-members').click()
  await expect(page.getByTestId('addUserBtn')).toBeDisabled()
  await page
    .getByTestId('addUserSuggestionInput')
    .locator('input')
    .fill(userEmail)
  await page.getByTestId('addUserBtn').click()
}

export async function deleteAdminRole({ page }: { page: Page }) {
  await page.getByTestId('deleteBtn').click()
  await page.getByTestId('confirmDeletionBtn').click()
}
