import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

async function setCheckboxValue(page: Page, name: string, checked: boolean) {
  const input = page.getByTestId(`input-checkbox-${name}`)
  await expect(input).toBeVisible()
  await input.evaluate((el: HTMLInputElement, nextChecked: boolean) => {
    el.checked = nextChecked
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, checked)
  await expect(input).toBeChecked({ checked })
}

export async function setCheckbox(page: Page, name: string) {
  await setCheckboxValue(page, name, true)
}

export async function unsetCheckbox(page: Page, name: string) {
  await setCheckboxValue(page, name, false)
}
