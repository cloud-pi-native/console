import { describe, expect, it } from 'vitest'
import { genericProxy } from './proxy'

// Création d'une cible de test
const target = {
  async fetchData(id: string) {
    return { id, data: 'Mocked data' }
  },
  async otherMethod(id: string) {
    return { id, data: 'Mocked data' }
  },
}

describe('test calls without ID passed', () => {
  // Test d'appel de méthode sans ID
  it('calling method without ID', async () => {
    const proxied = genericProxy(target)
    const result = await proxied.fetchData()
    expect(result).toEqual({ id: undefined, data: 'Mocked data' })
  })

  // Fonction de test asynchrone pour tester le cas où aucune ID n'est fournie
  it('test when no ID is provided', async () => {
  // Création d'une cible de test
    const target = {
      async fetchData() {
        return 'No ID provided'
      },
    }

    // Création du proxy
    const proxied = genericProxy(target)

    // Appel à la méthode fetchData sans ID
    const result = await proxied.fetchData()

    // Vérification que le résultat est correct
    expect(result).toBe('No ID provided')
  })

  // Fonction de test asynchrone pour tester le cas où aucune ID n'est fournie avec une promesse en cours
  it('test when no ID is provided with pending promise', async () => {
  // Création d'une cible de test
    const target = {
      async fetchData() {
        return new Promise(resolve => setTimeout(() => resolve('Pending result'), 100))
      },
    }

    // Création du proxy
    const proxied = genericProxy(target)

    // Appel à la méthode fetchData sans ID
    const promise1 = proxied.fetchData()
    const promise2 = proxied.fetchData() // Deuxième appel avant la résolution du premier

    // Attendre que la première promesse se résolve
    const result1 = await promise1

    // Vérification que le résultat de la première promesse est correct
    expect(result1).toBe('Pending result')

    // Attendre que la deuxième promesse se résolve
    const result2 = await promise2

    // Vérification que le résultat de la deuxième promesse est correct
    expect(result2).toBe('Pending result')
  })
  // Test pour vérifier que l'erreur est levée lorsque args est fourni sans ID
  it('test error when args provided without ID', async () => {
    // Création d'une cible de test
    const target = {
      async fetchData(_id: string, _args: any) {
        return 'No ID provided'
      },
    }

    // Création du proxy
    const proxied = genericProxy(target)

    const args = { key: 'value' }

    // Appel de la fonction fetchData avec des arguments mais sans ID
    await expect(proxied.fetchData(undefined, args)).rejects.toThrow('ID is required when args are provided')
  })
})

describe('test calls with ID passed', () => {
  // Test d'appel de méthode avec ID
  it('calling method with ID', async () => {
    const proxied = genericProxy(target)
    const result = await proxied.fetchData('123')
    expect(result).toEqual({ id: '123', data: 'Mocked data' })
  })

  // Test d'appel de méthode avec exclusion en cours
  it('calling method with exclusion in progress', async () => {
    const proxied = genericProxy(target, { fetchData: ['otherMethod'] })
    // Simuler une exécution en cours pour la méthode exclue
    proxied.otherMethod('456')

    // Maintenant, tenter d'appeler fetchData pour le même ID devrait échouer
    await expect(proxied.fetchData('456')).rejects.toThrow(
      'otherMethod in progress on 456, can\'t fetchData',
    )
  })

  // Fonction de test asynchrone pour tester le mélange des nextArgs
  it('test mixing nextArgs from concurrent promises', async () => {
    // Création d'une cible de test
    const target = {
      async fetchData(id: string, args?: object) {
        return { id, args }
      },
    }

    // Création du proxy
    const proxied = genericProxy(target)

    const promise1 = proxied.fetchData('123', { key1: 'value1' })
    // Appels successifs à fetchData avec différents arguments
    const promise2 = proxied.fetchData('123', { key2: 'value2' })

    // Promesse concurrente avec des nextArgs différents
    const promise3 = proxied.fetchData('123', { key3: 'value3' })

    // Attendre que les promesses se résolvent
    const result1 = await promise1
    const result2 = await promise2
    const result3 = await promise3

    // Vérification que les nextArgs de promise2 et promise3 ont été correctement mélangés
    expect(result1.args).toEqual({ key1: 'value1' })
    expect(result2.args).toEqual({ key2: 'value2', key3: 'value3' })
    expect(result3.args).toEqual({ key2: 'value2', key3: 'value3' })
  })

  it('test rejection of set attempt', () => {
    // Création d'une cible de test
    const target = {
      async fetchData() {
        return 'Mocked data'
      },
    }

    // Création du proxy
    const proxied = genericProxy(target)

    // Tentative de définir une nouvelle propriété sur le proxy
    const setAttempt = () => {
      proxied.fetchData = () => new Promise(resolve => resolve('illegal'))
    }

    // Vérification que la tentative de set est rejetée
    expect(setAttempt).toThrow(TypeError)
  })
})
