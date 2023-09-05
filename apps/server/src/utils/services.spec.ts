import { describe, it, expect } from 'vitest'
import { getServices } from './services.js'

describe('services', () => {
  it('Should return an object of services for a given project', () => {
    const project = {
      id: 'thisIsAnId',
      name: 'myProjectName',
      organization: 'myOrganization',
    }

    project.services = getServices(project)

    expect(Object.values(project.services).length).toEqual(6)
    expect(project).toHaveProperty('id', project.id)
    expect(project).toHaveProperty('name', project.name)
    expect(project).toHaveProperty('organization', project.organization)
    Object.values(project.services).forEach(service => {
      expect(service).toHaveProperty('name')
      expect(service).toHaveProperty('title')
      expect(service).toHaveProperty('imgSrc')
      expect(service).toHaveProperty('description')
      expect(service).toHaveProperty('to')
    })
  })
})
