import { describe, expect, it } from 'vitest'
import { parseLogsViewQuery, serializeLogsViewState } from '@/utils/logs-view.js'

describe('logs-view', () => {
  describe('parseLogsViewQuery', () => {
    it('retourne les valeurs par défaut pour une query vide', () => {
      expect(parseLogsViewQuery({})).toStrictEqual({ page: 0, hideLogs: false, hideLogDetails: false })
    })

    it('restaure la page et les bascules depuis des valeurs valides', () => {
      expect(parseLogsViewQuery({ page: '3', hideLogs: 'true', hideLogDetails: 'true' }))
        .toStrictEqual({ page: 3, hideLogs: true, hideLogDetails: true })
      expect(parseLogsViewQuery({ page: '0', hideLogs: 'false', hideLogDetails: 'false' }))
        .toStrictEqual({ page: 0, hideLogs: false, hideLogDetails: false })
    })

    it('retombe sur les défauts pour des valeurs invalides, sans erreur', () => {
      expect(parseLogsViewQuery({ page: 'abc', hideLogs: 'yes', hideLogDetails: 'no' }))
        .toStrictEqual({ page: 0, hideLogs: false, hideLogDetails: false })
      expect(parseLogsViewQuery({ page: '-1' }).page).toBe(0)
      expect(parseLogsViewQuery({ page: '1.5' }).page).toBe(0)
      expect(parseLogsViewQuery({ page: '' }).page).toBe(0)
      expect(parseLogsViewQuery({ page: null }).page).toBe(0)
    })

    it('prend la première valeur quand la query contient des tableaux', () => {
      expect(parseLogsViewQuery({ page: ['2', '9'], hideLogs: ['true'] }))
        .toStrictEqual({ page: 2, hideLogs: true, hideLogDetails: false })
    })
  })

  describe('serializeLogsViewState', () => {
    it('sérialise la page et les bascules non par défaut', () => {
      expect(serializeLogsViewState({ page: 2, hideLogs: true, hideLogDetails: false }))
        .toStrictEqual({ page: '2', hideLogs: 'true' })
    })

    it('omet les valeurs par défaut', () => {
      expect(serializeLogsViewState({ page: 0, hideLogs: false, hideLogDetails: false }))
        .toStrictEqual({})
    })

    it('sérialise puis restaure un état sans perte', () => {
      const state = { page: 4, hideLogs: false, hideLogDetails: true }
      expect(parseLogsViewQuery(serializeLogsViewState(state))).toStrictEqual(state)
    })
  })
})
