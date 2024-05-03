import { describe, expect, it } from 'vitest'
import { dbToObj } from '../project-service/business.ts'

describe('project bussiness utils', () => {
  it('should transform arrow ', async () => {
    const result = dbToObj([{ key: 'test', pluginName: 'test', value: 'test' }])
    expect(result).toEqual({ test: { test: 'test' } })
  })
})
