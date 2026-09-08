import { describe } from 'vitest'
import {
  GRAFANA_SUBGROUP_HPROD_RO,
  GRAFANA_SUBGROUP_HPROD_RW,
  GRAFANA_SUBGROUP_PROD_RO,
  GRAFANA_SUBGROUP_PROD_RW,
} from '../src/modules/observability/observability.constants'

export const canRunObservabilityE2E = Boolean(process.env.E2E)

export const describeWithObservability = describe.runIf(canRunObservabilityE2E)

export const ALL_GRAFANA_SUBGROUPS = [
  GRAFANA_SUBGROUP_PROD_RW,
  GRAFANA_SUBGROUP_PROD_RO,
  GRAFANA_SUBGROUP_HPROD_RW,
  GRAFANA_SUBGROUP_HPROD_RO,
] as const
