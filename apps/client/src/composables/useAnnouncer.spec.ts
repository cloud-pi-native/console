import { beforeEach, describe, expect, it } from 'vitest'
import { announce, routeAnnouncement, useAnnouncer } from './useAnnouncer.js'

describe('useAnnouncer', () => {
  beforeEach(() => {
    announce('')
  })

  it('formats an announcement from the route title', () => {
    expect(routeAnnouncement({ meta: { title: 'Mes projets' } })).toBe('Page : Mes projets')
  })

  it('falls back to the application name when the route has no title', () => {
    expect(routeAnnouncement({ meta: {} })).toBe('Page : Console Cloud π Native')
  })

  it('trims and exposes the current announcement', () => {
    const { announcement } = useAnnouncer()

    announce('  Projet enregistré  ')

    expect(announcement.value).toBe('Projet enregistré')
  })

  it('ignores an empty announcement so the region keeps its last useful message', () => {
    const { announcement } = useAnnouncer()
    announce('Projet enregistré')

    announce('   ')

    expect(announcement.value).toBe('Projet enregistré')
  })
})
