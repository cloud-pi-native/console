import { DEFAULT, DISABLED, PROJECT_PERMS } from '@cpn-console/shared'
import { describe, expect, it } from 'vitest'
import { makeProject } from './observability-testing.utils'
import { ENABLED_PLUGIN_KEY, GRAFANA_GROUP_NAME, GRAFANA_SUBGROUP_HPROD_RO, GRAFANA_SUBGROUP_HPROD_RW, GRAFANA_SUBGROUP_PROD_RO, GRAFANA_SUBGROUP_PROD_RW, PLUGIN_NAME } from './observability.constants'
import {
  generateGrafanaGroupPath,
  generateGrafanaHprodRbacGroupPaths,
  generateGrafanaProdRbacGroupPaths,
  generateObservabilityProject,
  generateTenantId,
  getListPerms,
  isPluginDisabled,
} from './observability.utils'

const PROD_STAGE = { name: 'prod' } as const
const HPROD_STAGE = { name: 'hprod' } as const

describe('getListPerms', () => {
  it('grants rw + ro to owner', () => {
    const project = makeProject({
      ownerId: 'owner-1',
      environments: [{ id: 'env-1', name: 'prod-env', stage: PROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms.prod.edit).toContain('owner-1')
    expect(perms.prod.view).toContain('owner-1')
  })

  it('assigns to prod bucket when a prod environment exists', () => {
    const project = makeProject({
      ownerId: 'owner-1',
      environments: [{ id: 'env-1', name: 'prod-env', stage: PROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms.prod.edit).toContain('owner-1')
    expect(perms['hors-prod'].edit).not.toContain('owner-1')
  })

  it('assigns to hors-prod bucket when no prod environment', () => {
    const project = makeProject({
      ownerId: 'owner-1',
      environments: [{ id: 'env-1', name: 'dev-env', stage: HPROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms['hors-prod'].edit).toContain('owner-1')
    expect(perms.prod.edit).not.toContain('owner-1')
  })

  it('grants ro but not rw to a member with only LIST_ENVIRONMENTS', () => {
    const roRoleId = 'role-ro'
    const project = makeProject({
      ownerId: 'owner-1',
      members: [{
        roleIds: [roRoleId],
        user: { id: 'user-ro', email: 'ro@test.com' },
      }],
      roles: [{ id: roRoleId, permissions: PROJECT_PERMS.LIST_ENVIRONMENTS, oidcGroup: '', type: 'managed' }],
      environments: [{ id: 'env-1', name: 'dev-env', stage: HPROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms['hors-prod'].view).toContain('user-ro')
    expect(perms['hors-prod'].edit).not.toContain('user-ro')
  })

  it('grants rw to a member with MANAGE_ENVIRONMENTS', () => {
    const rwRoleId = 'role-rw'
    const project = makeProject({
      ownerId: 'owner-1',
      members: [{
        roleIds: [rwRoleId],
        user: { id: 'user-rw', email: 'rw@test.com' },
      }],
      roles: [{ id: rwRoleId, permissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS, oidcGroup: '', type: 'managed' }],
      environments: [{ id: 'env-1', name: 'dev-env', stage: HPROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms['hors-prod'].edit).toContain('user-rw')
    expect(perms['hors-prod'].view).toContain('user-rw')
  })

  it('excludes members with no environment permissions', () => {
    const noPermRoleId = 'role-none'
    const project = makeProject({
      ownerId: 'owner-1',
      members: [{
        roleIds: [noPermRoleId],
        user: { id: 'user-none', email: 'none@test.com' },
      }],
      roles: [{ id: noPermRoleId, permissions: 0n, oidcGroup: '', type: 'managed' }],
      environments: [{ id: 'env-1', name: 'dev-env', stage: HPROD_STAGE }],
    })
    const perms = getListPerms(project)
    expect(perms['hors-prod'].view).not.toContain('user-none')
    expect(perms['hors-prod'].edit).not.toContain('user-none')
  })
})

describe('generateGrafanaGroupPath', () => {
  it('builds the full grafana group path', () => {
    expect(generateGrafanaGroupPath('/my-project', GRAFANA_SUBGROUP_PROD_RW))
      .toBe(`/my-project/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_PROD_RW}`)
  })

  it('strips trailing slash from root path', () => {
    expect(generateGrafanaGroupPath('/my-project/', GRAFANA_SUBGROUP_HPROD_RO))
      .toBe(`/my-project/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_HPROD_RO}`)
  })
})

describe('generateGrafanaProdRbacGroupPaths', () => {
  it('returns [rw, ro] pair', () => {
    const [rw, ro] = generateGrafanaProdRbacGroupPaths('/proj')
    expect(rw).toBe(`/proj/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_PROD_RW}`)
    expect(ro).toBe(`/proj/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_PROD_RO}`)
  })
})

describe('generateGrafanaHprodRbacGroupPaths', () => {
  it('returns [rw, ro] pair', () => {
    const [rw, ro] = generateGrafanaHprodRbacGroupPaths('/proj')
    expect(rw).toBe(`/proj/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_HPROD_RW}`)
    expect(ro).toBe(`/proj/${GRAFANA_GROUP_NAME}/${GRAFANA_SUBGROUP_HPROD_RO}`)
  })
})

describe('buildTenantId', () => {
  it('compresses the project id', () => {
    const tenantId = generateTenantId('prod', '00000000-0000-4000-8000-000000000001')
    expect(tenantId).toMatch(/^prod-/)
    expect(tenantId).not.toContain('00000000-0000-4000-8000-000000000001')
  })
})

describe('buildObservabilityProject', () => {
  it('builds project value with both envs when both stages present', () => {
    const project = makeProject({
      environments: [
        { id: 'env-prod', name: 'prod', stage: PROD_STAGE },
        { id: 'env-dev', name: 'dev', stage: HPROD_STAGE },
      ],
    })
    const result = generateObservabilityProject(project, {
      repositoryUrl: 'https://gitlab.example.com/repo',
      tenantRbacProd: ['/proj/grafana/prod-RW', '/proj/grafana/prod-RO'],
      tenantRbacHProd: ['/proj/grafana/hprod-RW', '/proj/grafana/hprod-RO'],
    })
    expect(result.projectName).toBe('test-project')
    expect(result.projectRepository.url).toBe('https://gitlab.example.com/repo')
    expect(result.envs.prod?.groups).toEqual(['/proj/grafana/prod-RW', '/proj/grafana/prod-RO'])
    expect(result.envs.hprod?.groups).toEqual(['/proj/grafana/hprod-RW', '/proj/grafana/hprod-RO'])
    expect(Object.keys(result.envs.prod?.tenants ?? {})).toHaveLength(1)
    expect(Object.keys(result.envs.hprod?.tenants ?? {})).toHaveLength(1)
  })

  it('drops empty env config when no matching environments', () => {
    const project = makeProject({
      environments: [{ id: 'env-dev', name: 'dev', stage: HPROD_STAGE }],
    })
    const result = generateObservabilityProject(project, {
      repositoryUrl: 'https://gitlab.example.com/repo',
      tenantRbacProd: ['/proj/grafana/prod-RW', '/proj/grafana/prod-RO'],
      tenantRbacHProd: ['/proj/grafana/hprod-RW', '/proj/grafana/hprod-RO'],
    })
    expect(result.envs.prod).toBeUndefined()
    expect(result.envs.hprod).toBeDefined()
  })
})

describe('isPluginDisabled', () => {
  it('returns true when the observability plugin is explicitly disabled', () => {
    const project = makeProject({
      plugins: [{ pluginName: PLUGIN_NAME, key: ENABLED_PLUGIN_KEY, value: DISABLED }],
    })
    expect(isPluginDisabled(project)).toBe(true)
  })

  it('returns false when plugin config is absent', () => {
    const project = makeProject({ plugins: [] })
    expect(isPluginDisabled(project)).toBe(false)
  })

  it('returns false when plugin config has a non-disabled value', () => {
    const project = makeProject({
      plugins: [{ pluginName: PLUGIN_NAME, key: ENABLED_PLUGIN_KEY, value: DEFAULT }],
    })
    expect(isPluginDisabled(project)).toBe(false)
  })
})
