import { StepCall } from '@/plugins/hooks/hook.js'
import { destroyVault, listVault } from './secret'

export const purgeAll: StepCall<object> = async () => {
  const allSecrets = await listVault('')

  for (const secret of allSecrets) {
    await destroyVault(secret)
  }
  return {
    status: {
      result: 'OK',
      message: 'Vault secrets deleted',
    },
  }
}
