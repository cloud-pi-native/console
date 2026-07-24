import { ConditionalModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { MainModule } from '../../main.module'
import { OpenCdsHealthService } from './opencds-health.service'
import { OpenCdsModule } from './opencds.module'

describe('openCdsModule (conditional registration)', () => {
  const originalUseOpenCds = process.env.USE_OPENCDS

  afterEach(() => {
    if (originalUseOpenCds === undefined) delete process.env.USE_OPENCDS
    else process.env.USE_OPENCDS = originalUseOpenCds
  })

  it('omits OpenCdsHealthService when USE_OPENCDS=false', async () => {
    process.env.USE_OPENCDS = 'false'
    const module = await Test.createTestingModule({
      imports: [MainModule, ConditionalModule.registerWhen(OpenCdsModule, 'USE_OPENCDS')],
    }).compile()
    expect(() => module.get(OpenCdsHealthService)).toThrow()
  })
})
