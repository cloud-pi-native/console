import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import ChoiceSelector from '@/components/ChoiceSelector.vue'

describe('ChoiceSelector.vue', () => {
  const options = [
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' },
    { id: '3', name: 'Option 3' },
  ]

  const selectedOptions = [
    { id: '1', name: 'Option 1' },
  ]

  beforeEach(() => {
    cy.mount(ChoiceSelector, {
      props: {
        options,
        optionsSelected: selectedOptions,
        title: 'Test Title',
        description: 'Test Description',
        disabled: false,
        id: 'test-multi-select',
        valueKey: 'id',
        labelKey: 'name',
        wrapped: false,
      },
    })
  })

  it('Should mount and display correctly', () => {
    cy.get('[data-testid="choice-selector-title-test-multi-select"]').should('exist').and('contain', 'Test Title')
    cy.get('[data-testid="choice-selector-description-test-multi-select"]').should('exist').and('contain', 'Test Description')
  })

  it('Should display options correctly', () => {
    cy.get('[data-testid="1-test-multi-select-tag"]').should('exist').and('contain', 'Option 1')
    cy.get('[data-testid="2-test-multi-select-tag"]').should('exist').and('contain', 'Option 2')
    cy.get('[data-testid="3-test-multi-select-tag"]').should('exist').and('contain', 'Option 3')
  })

  it('Should search and filter options', () => {
    cy.get('[data-testid="choice-selector-search-test-multi-select"]').type('Option 2')
    cy.get('[data-testid="2-test-multi-select-tag"]').should('be.visible')
    cy.get('[data-testid="1-test-multi-select-tag"]').should('not.exist')
    cy.get('[data-testid="3-test-multi-select-tag"]').should('not.exist')
  })

  it('Should add and remove options', () => {
    cy.get('[data-testid="2-test-multi-select-tag"]').click()
    cy.get('[data-testid="2-test-multi-select-tag"]').should('have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="1-test-multi-select-tag"]').click()
    cy.get('[data-testid="1-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
  })

  it('Should handle add all and remove all', () => {
    cy.get('[data-testid="choice-selector-add-all-test-multi-select"]').click()
    cy.get('[data-testid="1-test-multi-select-tag"]').should('have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="2-test-multi-select-tag"]').should('have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="3-test-multi-select-tag"]').should('have.class', 'fr-tag--dismiss')

    cy.get('[data-testid="choice-selector-remove-all-test-multi-select"]').click()
    cy.get('[data-testid="1-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="2-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="3-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
  })

  it('Should handle add visible and remove visible', () => {
    cy.get('[data-testid="choice-selector-search-test-multi-select"]').type('Option 2')
    cy.get('[data-testid="choice-selector-add-visible-test-multi-select"]').click()
    cy.get('[data-testid="2-test-multi-select-tag"]').should('have.class', 'fr-tag--dismiss')

    cy.get('[data-testid="choice-selector-search-test-multi-select"]').clear()
    cy.get('[data-testid="choice-selector-remove-visible-test-multi-select"]').click()
    cy.get('[data-testid="1-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="2-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
    cy.get('[data-testid="3-test-multi-select-tag"]').should('not.have.class', 'fr-tag--dismiss')
  })

  it('Should display correct message when no options available', () => {
    // Remount the component with no options
    cy.mount(ChoiceSelector, {
      props: {
        options: [],
        optionsSelected: [],
        title: 'Test Title',
        description: 'Test Description',
        disabled: false,
        id: 'test-multi-select',
        valueKey: 'id',
        labelKey: 'name',
        wrapped: false,
      },
    })

    cy.contains('Aucun choix disponible').should('be.visible')
  })

  it('Should display correct wrapped message when no selected options', () => {
    // Remount the component with no selected options
    cy.mount(ChoiceSelector, {
      props: {
        options,
        optionsSelected: [],
        title: 'Test Title',
        description: 'Test Description',
        disabled: false,
        id: 'test-multi-select',
        valueKey: 'id',
        labelKey: 'name',
        wrapped: true,
      },
    })

    cy.contains('Aucune sélection, 3 choix disponibles').should('be.visible')
  })
  it('Should display correct wrapped message when more than 3 selected options', () => {
    // Remount the component with no selected options
    const options = [
      { id: '1', name: 'Option 1' },
      { id: '2', name: 'Option 2' },
      { id: '3', name: 'Option 3' },
      { id: '4', name: 'Option 4' },
      { id: '5', name: 'Option 5' },
    ]
    cy.mount(ChoiceSelector, {
      props: {
        options,
        optionsSelected: options,
        title: 'Test Title',
        description: 'Test Description',
        disabled: false,
        id: 'test-multi-select',
        valueKey: 'id',
        labelKey: 'name',
        wrapped: true,
      },
    })

    cy.contains('et 2 de +').should('be.visible')
  })
})
