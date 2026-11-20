import { describe, expect, it } from 'vitest'
import { withDefaultMarker } from './config-default-marker.js'

const options = [
  { label: 'Activé', value: 'enabled' },
  { label: 'Par Défaut', value: 'default' },
  { label: 'Désactivé', value: 'disabled' },
]

describe('withDefaultMarker', () => {
  it('suffixes the option matching the plugin-declared initial value', () => {
    const marked = withDefaultMarker(options, 'enabled')
    expect(marked[0].label).toBe('Activé — valeur par défaut')
    expect(marked[1].label).toBe('Par Défaut')
    expect(marked[2].label).toBe('Désactivé')
  })

  it('suffixes the disabled option when the plugin declares it', () => {
    const marked = withDefaultMarker(options, 'disabled')
    expect(marked[2].label).toBe('Désactivé — valeur par défaut')
    expect(marked[0].label).toBe('Activé')
  })

  it('adds no marker when the initial value is default', () => {
    expect(withDefaultMarker(options, 'default')).toEqual(options)
  })

  it('adds no marker when the initial value is missing', () => {
    expect(withDefaultMarker(options, undefined)).toEqual(options)
  })

  it('keeps all three options selectable', () => {
    const marked = withDefaultMarker(options, 'enabled')
    expect(marked.map(({ value }) => value)).toEqual(['enabled', 'default', 'disabled'])
  })
})
