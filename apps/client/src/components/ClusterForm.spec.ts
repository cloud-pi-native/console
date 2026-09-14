import { describe, expect, it } from 'vitest'
import { getClusterLabelValidationMessage } from '@/utils/cluster.js'

describe('getClusterLabelValidationMessage', () => {
  it('returns the length message for a label longer than 50 characters', () => {
    expect(getClusterLabelValidationMessage('a'.repeat(51))).toBe(
      'Le nom du cluster ne doit pas dépasser 50 caractères',
    )
  })
})
