import { services } from '@cpn-console/hooks'

export const checkServicesHealth = async () => services.getStatus()
