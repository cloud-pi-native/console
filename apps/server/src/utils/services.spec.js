import { describe, it, expect } from 'vitest'
import { getServices } from './services.js'

describe('services', () => {
  it('Should return an array of services for a given project', () => {
    const project = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      organization: 'myOrganization',
      Organization: {
        dataValues: {
          name: 'myOrganization',
        },
      },
    }

    const populatedProject = getServices(project)

    expect(populatedProject.services.length).toEqual(6)
    expect(populatedProject).toHaveProperty('id', project.id)
    expect(populatedProject).toHaveProperty('name', project.name)
    expect(populatedProject).toHaveProperty('organization', project.Organization.dataValues.name)
    populatedProject.services.forEach(service => {
      expect(service).toHaveProperty('id')
      expect(service).toHaveProperty('title')
      expect(service).toHaveProperty('imgSrc')
      expect(service).toHaveProperty('description')
      expect(service).toHaveProperty('to')
    })
  })
})
