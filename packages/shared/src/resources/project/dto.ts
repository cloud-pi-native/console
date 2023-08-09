export type CreateProjectDto = {
    body: {
      organizationId: string
      name: string
      description: string
  }
}

export type UpdateProjectDto = {
    body: {
      organizationId: string
      name: string
      description: string
  }
}
