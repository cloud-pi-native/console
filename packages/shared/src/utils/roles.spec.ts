import { describe, expect, it } from 'vitest'
import {
  generateSystemRoleType,
  getBaseRoleType,
  isExternalRoleType,
  isGlobalRoleType,
  isManagedRoleType,
  isSystemRoleType,
} from './roles.js'

describe('roles', () => {
  describe('generateSystemRoleType', () => {
    it('prefixes a base type with system:', () => {
      expect(generateSystemRoleType('external')).toBe('system:external')
    })

    it('returns system:undefined for undefined input', () => {
      expect(generateSystemRoleType(undefined)).toBe('system:undefined')
    })

    it('returns system:null for null input', () => {
      expect(generateSystemRoleType(null)).toBe('system:null')
    })
  })

  describe('isSystemRoleType', () => {
    it('returns true for system: prefixed values', () => {
      expect(isSystemRoleType('system:external')).toBe(true)
      expect(isSystemRoleType('system:managed')).toBe(true)
    })

    it('returns false for non-system values', () => {
      expect(isSystemRoleType('external')).toBe(false)
      expect(isSystemRoleType('managed')).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(isSystemRoleType(null)).toBe(false)
      expect(isSystemRoleType(undefined)).toBe(false)
    })
  })

  describe('getBaseRoleType', () => {
    it('strips system: prefix', () => {
      expect(getBaseRoleType('system:external')).toBe('external')
      expect(getBaseRoleType('system:managed')).toBe('managed')
    })

    it('returns non-system values as-is', () => {
      expect(getBaseRoleType('external')).toBe('external')
      expect(getBaseRoleType('managed')).toBe('managed')
    })

    it('returns undefined for null or undefined', () => {
      expect(getBaseRoleType(null)).toBeUndefined()
      expect(getBaseRoleType(undefined)).toBeUndefined()
    })
  })

  describe('isExternalRoleType', () => {
    it('returns true for system:external', () => {
      expect(isExternalRoleType('system:external')).toBe(true)
    })

    it('returns true for bare external', () => {
      expect(isExternalRoleType('external')).toBe(true)
    })

    it('returns false for other system types', () => {
      expect(isExternalRoleType('system:managed')).toBe(false)
      expect(isExternalRoleType('system:global')).toBe(false)
    })

    it('returns false for non-external types', () => {
      expect(isExternalRoleType('managed')).toBe(false)
      expect(isExternalRoleType('global')).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(isExternalRoleType(null)).toBe(false)
      expect(isExternalRoleType(undefined)).toBe(false)
    })
  })

  describe('isManagedRoleType', () => {
    it('returns true for system:managed', () => {
      expect(isManagedRoleType('system:managed')).toBe(true)
    })

    it('returns true for bare managed', () => {
      expect(isManagedRoleType('managed')).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isManagedRoleType('external')).toBe(false)
      expect(isManagedRoleType('global')).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(isManagedRoleType(null)).toBe(false)
      expect(isManagedRoleType(undefined)).toBe(false)
    })
  })

  describe('isGlobalRoleType', () => {
    it('returns true for system:global', () => {
      expect(isGlobalRoleType('system:global')).toBe(true)
    })

    it('returns true for bare global', () => {
      expect(isGlobalRoleType('global')).toBe(true)
    })

    it('returns false for other types', () => {
      expect(isGlobalRoleType('external')).toBe(false)
      expect(isGlobalRoleType('managed')).toBe(false)
    })

    it('returns false for null or undefined', () => {
      expect(isGlobalRoleType(null)).toBe(false)
      expect(isGlobalRoleType(undefined)).toBe(false)
    })
  })
})
