import { boot } from 'node-vault-client'

const vaultClient = boot('main', {
  api: { url: 'https://vault.example.com:8200/' },
  auth: {
    type: 'appRole', // or 'token', 'iam'
    config: { role_id: '637c065f-c644-5e12-d3d1-e9fa4363af61' },
  },
})

export const readVault = (path) => {
  vaultClient.read(path).then(v => {
    console.log(v)
  }).catch(e => console.error(e))
}
