import { getApi } from './utils.js'
import { isValidCron } from 'cron-validator'

// https://github.com/goharbor/harbor/blob/main/src/server/v2.0/handler/retention.go
export type RuleTemplate =
  | 'always'
  | 'latestPulledK'
  | 'latestPushedK'
  | 'nDaysSinceLastPull'
  | 'nDaysSinceLastPush'

const allowed: RuleTemplate[] = [
  'always',
  'latestPulledK',
  'latestPushedK',
  'nDaysSinceLastPull',
  'nDaysSinceLastPush',
]

export const harborRuleTemplate: RuleTemplate = allowed.includes(process.env.HARBOR_RULE_TEMPLATE as RuleTemplate)
  ? (process.env.HARBOR_RULE_TEMPLATE as RuleTemplate)
  : 'latestPushedK'

const countEnv = Number(process.env.HARBOR_RULE_COUNT)
export const harborRuleCount = !Number.isNaN(countEnv) && countEnv > 0
  ? countEnv
  : harborRuleTemplate === 'always'
    ? 1
    : 10

const defaultCron = '0 22 2 * * *'
const envCron = process.env.HARBOR_RETENTION_CRON?.trim()

export const harborRetentionCron = envCron && isValidCron(envCron, { seconds: true })
  ? envCron
  : defaultCron

export interface TagSelector {
  kind: 'doublestar' | 'label'
  decoration: 'matches' | 'excludes' | 'repoMatches' | 'repoExcludes'
  pattern: string
}

export interface Rule {
  disabled: boolean
  action: 'retain' | 'delete'
  template: RuleTemplate
  params: Record<string, number>
  tag_selectors: TagSelector[]
  scope_selectors: Record<string, TagSelector[]>
}

export interface Trigger {
  kind: 'Schedule'
  settings: { cron: string }
  references: unknown[]
}

export interface Policy {
  algorithm: 'or' | 'and'
  rules: Rule[]
  trigger: Trigger
  scope: { level: 'project', ref: number }
}

export function makeDefaultPolicy(projectId: number): Policy {
  return {
    algorithm: 'or',
    scope: { level: 'project', ref: projectId },
    rules: [
      {
        disabled: false,
        action: 'retain',
        template: harborRuleTemplate,
        params: { [harborRuleTemplate]: harborRuleCount },
        tag_selectors: [
          { kind: 'doublestar', decoration: 'matches', pattern: '**' },
        ],
        scope_selectors: {
          repository: [
            { kind: 'doublestar', decoration: 'repoMatches', pattern: '**' },
          ],
        },
      },
    ],
    trigger: {
      kind: 'Schedule',
      settings: { cron: harborRetentionCron },
      references: [],
    },
  }
}

export async function addRetentionPolicy(
  projectName: string,
  projectId: number,
): Promise<void> {
  const api = getApi()
  const ref = Number(projectId)
  if (Number.isNaN(ref)) throw new Error(`Invalid projectId: ${projectId}`)

  const policy: Policy = makeDefaultPolicy(ref)
  const project = await api.projects.getProject(projectName)
  const retentionId = Number(project?.data?.metadata?.retention_id)

  try {
    if (retentionId && !Number.isNaN(retentionId)) {
      await api.retentions.updateRetention(retentionId, policy as unknown as any)
    } else {
      await api.retentions.createRetention(policy as unknown as any)
    }
  } catch (err: any) {
    const payload = JSON.stringify(policy, null, 2)
    const details = err?.response?.data ?? 'Unknown error'
    console.error('Failed to apply Harbor retention policy', {
      projectName,
      projectId: project?.data?.project_id,
      retentionId,
      payload,
      details,
      error: err,
    })
    throw new Error(
      `Retention policy failed for project "${projectName}": ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`,
    )
  }
}
