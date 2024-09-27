import { describe, expect, it } from 'vitest'
import { PluginApi } from '../utils/utils.ts'
import { createHook, executeStep } from './hook.ts'

const okStatus = { status: { result: 'OK' } } as const
const koStatus = { status: { result: 'KO', message: 'Failed' } } as const
const warningStatus = { status: { result: 'WARNING', message: 'Failed' } } as const

async function simpleOkHookCall() {
  return okStatus
}
async function simpleFailedHookCall() {
  return koStatus
}
async function simpleWarningHookCall() {
  return warningStatus
}

describe('test executeStep mechanism', () => {
  it('test payload results, everything ok', async () => {
    const results = await executeStep({
      plugin1: simpleOkHookCall,
      plugin2: simpleOkHookCall,
    }, { apis: {}, args: {}, config: {}, failed: false, results: {}, warning: [] }, 'main')

    expect(results.apis).toEqual({})
    expect(results.args).toEqual({})
    expect(results.config).toEqual({})
    expect(results.failed).toBe(false)
    expect(results.warning).toEqual([])
    expect(results.results).toEqual({
      plugin1: { ...okStatus, executionTime: { main: expect.any(Number) } },
      plugin2: { ...okStatus, executionTime: { main: expect.any(Number) } },
    })
  })

  it('test payload results, everything ko', async () => {
    const results = await executeStep({
      plugin1: simpleFailedHookCall,
      plugin2: simpleFailedHookCall,
    }, { apis: {}, args: {}, config: {}, failed: false, results: {}, warning: [] }, 'main')

    expect(results.apis).toEqual({})
    expect(results.args).toEqual({})
    expect(results.config).toEqual({})
    expect(results.warning).toEqual([])
    expect(results.failed).contain('plugin1')
    expect(results.failed).contain('plugin2')
    expect(results.results).toEqual({
      plugin1: { ...koStatus, executionTime: { main: expect.any(Number) } },
      plugin2: { ...koStatus, executionTime: { main: expect.any(Number) } },
    })
  })

  it('test payload results, partial ko', async () => {
    const results = await executeStep({
      plugin1: simpleOkHookCall,
      plugin2: simpleFailedHookCall,
    }, { apis: {}, args: {}, config: {}, failed: false, results: {}, warning: [] }, 'main')

    expect(results.apis).toEqual({})
    expect(results.args).toEqual({})
    expect(results.config).toEqual({})
    expect(results.warning).toEqual([])
    expect(results.failed).not.contain('plugin1')
    expect(results.failed).contain('plugin2')
    expect(results.results).toEqual({
      plugin1: { ...okStatus, executionTime: { main: expect.any(Number) } },
      plugin2: { ...koStatus, executionTime: { main: expect.any(Number) } },
    })
  })

  it('test payload results, partial warning', async () => {
    const results = await executeStep({
      plugin1: simpleOkHookCall,
      plugin2: simpleWarningHookCall,
    }, { apis: {}, args: {}, config: {}, failed: false, results: {}, warning: [] }, 'main')

    expect(results.apis).toEqual({})
    expect(results.args).toEqual({})
    expect(results.config).toEqual({})
    expect(results.warning).toEqual(['plugin2'])
    expect(results.failed).toEqual(false)
    expect(results.results).toEqual({
      plugin1: { ...okStatus, executionTime: { main: expect.any(Number) } },
      plugin2: { ...warningStatus, executionTime: { main: expect.any(Number) } },
    })
  })
})

describe('createHook', () => {
  it('test empty hookStructure', async () => {
    const hook = createHook(false)
    expect(hook).toEqual({
      apis: {},
      steps: {
        check: {},
        pre: {},
        main: {},
        post: {},
        revert: {},
      },
      execute: expect.any(Function),
      validate: expect.any(Function),
    })

    const hookUnique = createHook(true)
    expect(hookUnique.uniquePlugin).toBe('')
  })

  it('test hook execution, simple ok', async () => {
    const hook = createHook(false)
    hook.steps.main.plugin1 = simpleOkHookCall

    const hookResult = await hook.execute({}, {})

    expect(hookResult.args).toEqual({})
    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(false)
    expect(hookResult.results).toEqual({
      plugin1: { ...okStatus, executionTime: { main: expect.any(Number) } },
    })
  })

  it('test payload results, multistep ok', async () => {
    const hook = createHook(false)
    hook.steps.pre.plugin1 = simpleOkHookCall
    hook.steps.main.plugin1 = simpleOkHookCall
    hook.steps.post.plugin1 = simpleOkHookCall

    const hookResult = await hook.execute({}, {})

    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(false)
    expect(hookResult.warning).toEqual([])
    expect(hookResult.results).toEqual({ plugin1: { ...okStatus, executionTime: {
      pre: expect.any(Number),
      main: expect.any(Number),
      post: expect.any(Number),
    } } })
  })

  it('test payload results, multistep with warning', async () => {
    const hook = createHook(false)
    hook.steps.pre.plugin1 = simpleWarningHookCall
    hook.steps.main.plugin2 = simpleOkHookCall
    hook.steps.post.plugin2 = simpleOkHookCall

    const hookResult = await hook.execute({}, {})

    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(false)
    expect(hookResult.warning).toEqual(['plugin1'])
    expect(hookResult.results).toEqual({
      plugin1: {
        ...warningStatus,
        executionTime: {
          pre: expect.any(Number),
        },
      },
      plugin2: {
        ...okStatus,
        executionTime: {
          main: expect.any(Number),
          post: expect.any(Number),
        },
      },
    })
  })

  it('test payload results, main fails', async () => {
    const hook = createHook(false)
    hook.apis.plugin1 = () => new PluginApi() // à tester ailleurs
    hook.steps.pre.plugin1 = simpleOkHookCall
    hook.steps.main.plugin1 = simpleFailedHookCall
    hook.steps.post.plugin1 = simpleOkHookCall

    const hookResult = await hook.execute({}, {})
    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(['plugin1'])
    expect(hookResult.results).toEqual({
      plugin1: {
        ...koStatus,
        executionTime: {
          pre: expect.any(Number),
          main: expect.any(Number),
        },
      },
    })
  })

  it('test hook validate, simple ok', async () => {
    const hook = createHook(false)
    hook.steps.check.plugin1 = simpleOkHookCall
    hook.apis.plugin1 = () => new PluginApi() // à tester ailleurs

    const hookResult = await hook.validate({}, {})

    expect(hookResult.args).toEqual({})
    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(false)
    expect(hookResult.results).toEqual({
      plugin1: { ...okStatus, executionTime: { validate: expect.any(Number) } },
    })
  })

  it('test hook validate, fail', async () => {
    const hook = createHook(false)
    hook.steps.check.plugin1 = simpleFailedHookCall

    const hookResult = await hook.validate({}, {})

    expect(hookResult.args).toEqual({})
    expect(hookResult.args).toEqual({})
    expect(hookResult.config).toEqual({})
    expect(hookResult.totalExecutionTime).toEqual(expect.any(Number))
    expect(hookResult.failed).toEqual(['plugin1'])
    expect(hookResult.results).toEqual({
      plugin1: { ...koStatus, executionTime: { validate: expect.any(Number) } },
    })
  })
})
