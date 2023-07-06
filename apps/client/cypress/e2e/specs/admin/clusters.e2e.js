describe('Administration clusters', () => {
  let clusters

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getAllClusters')

    cy.kcLogin('tcolin')
    cy.visit('/admin/clusters')
    cy.url().should('contain', '/admin/clusters')
    cy.wait('@getAllClusters', { timeout: 10000 }).its('response').then(response => {
      clusters = response?.body
    })
  })

  it('Should display clusters list', () => {
    clusters?.forEach(cluster => {
      cy.getByDataTestid(`clusterTile-${cluster.label}`)
    })
  })
})
