import { OrganizationModel } from './model.js'

export type CreateOrganizationDto = {
  body: {
    name: OrganizationModel['name'],
    label: OrganizationModel['label'],
    source: OrganizationModel['source'],
  }
}

export type UpdateOrganizationDto = {
  body: {
    name: OrganizationModel['name'],
    label: OrganizationModel['label'],
    active: OrganizationModel['active'],
    source: OrganizationModel['source'],
  }
  params: { orgName: OrganizationModel['name'] }
}
