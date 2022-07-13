// import faker from 'faker/locale/fr'

// function getRandomEmail () {
//   return faker.name.firstName().replace(/ /g, '') + '.' + faker.name.lastName().replace(/ /g, '') + '@'
// }

Cypress.Commands.add('deleteIndexedDB', () => {
  Cypress.on('window:before:load', win => {
    win.indexedDB.deleteDatabase('localforage')
  })
})

Cypress.on('uncaught:exception', (_err, _runnable) => {
  return false
})

Cypress.Commands.add('goOffline', () => {
  cy.log('**go offline**')
    .then(() => {
      return Cypress.automation('remote:debugger:protocol',
        {
          command: 'Network.enable',
        })
    })
    .then(() => {
      return Cypress.automation('remote:debugger:protocol',
        {
          command: 'Network.emulateNetworkConditions',
          params: {
            offline: true,
            latency: -1,
            downloadThroughput: -1,
            uploadThroughput: -1,
          },
        })
    })
})

Cypress.Commands.add('goOnline', () => {
  // disable offline mode, otherwise we will break our tests :)
  cy.log('**go online**')
    .then(() => {
    // https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-emulateNetworkConditions
      return Cypress.automation('remote:debugger:protocol',
        {
          command: 'Network.emulateNetworkConditions',
          params: {
            offline: false,
            latency: -1,
            downloadThroughput: -1,
            uploadThroughput: -1,
          },
        })
    })
    .then(() => {
      return Cypress.automation('remote:debugger:protocol',
        {
          command: 'Network.disable',
        })
    })
})

Cypress.Commands.add('assertOnline', () => {
  return cy.wrap(window).its('navigator.onLine').should('be.true')
})

Cypress.Commands.add('assertOffline', () => {
  return cy.wrap(window).its('navigator.onLine').should('be.false')
})

// Commande pour accéder / interagir avec le store dans les tests
Cypress.Commands.add('getStore', () => cy.window().its('app.$store'))

// A utiliser sur les éléments détâchés du DOM (lors de rerendu assez lourds dans le DOM)
// https://github.com/cypress-io/cypress/issues/7306#issuecomment-850621378
// Recursively gets an element, returning only after it's determined to be attached to the DOM for good
Cypress.Commands.add('getSettled', (selector, opts = {}) => {
  const retries = opts.retries || 3
  const delay = opts.delay || 100

  const isAttached = (resolve, count = 0) => {
    const el = Cypress.$(selector)

    // Is element attached to the DOM?
    count = Cypress.dom.isAttached(el) ? count + 1 : 0

    // Hit our base case, return the element
    if (count >= retries) {
      return resolve(el)
    }

    // Retry after a bit of a delay
    setTimeout(() => isAttached(resolve, count), delay)
  }

  // Wrap, so we can chain cypress commands off the result
  return cy.wrap(null).then(() => {
    return new Cypress.Promise((resolve) => {
      return isAttached(resolve, 0)
    }).then((el) => {
      return cy.wrap(el)
    })
  })
})

// mock de la geolocation (centré sur Lumière par défaut)
// cf https://github.com/cypress-io/cypress/issues/2671#issuecomment-564796821

Cypress.Commands.add('mockGeolocation', (latitude = 48.831792, longitude = 2.388606) => {
  cy.window().then(($window) => {
    cy.stub($window.navigator.geolocation, 'getCurrentPosition', (callback) => {
      // eslint-disable-next-line node/no-callback-literal
      return callback({ coords: { latitude, longitude } })
    })
  })
})
