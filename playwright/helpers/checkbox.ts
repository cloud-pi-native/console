import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

async function setCheckboxValue(locator: Locator, checked: boolean) {
  await expect(locator).toBeVisible()
  await locator.evaluate((el: HTMLInputElement, nextChecked: boolean) => {
    el.checked = nextChecked
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, checked)
  await expect(locator).toBeChecked({ checked })
}

export async function setCheckbox(locator: Locator) {
  await setCheckboxValue(locator, true)
}

export async function unsetCheckbox(locator: Locator) {
  await setCheckboxValue(locator, false)
}
