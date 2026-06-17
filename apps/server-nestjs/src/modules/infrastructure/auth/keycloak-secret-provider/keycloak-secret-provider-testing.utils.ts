import { generateKeyPairSync } from 'node:crypto'

export function makeJwksResponse(kid: string): Response {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  return new Response(JSON.stringify({
    keys: [
      {
        kid,
        kty: 'RSA',
        use: 'sig',
        n: jwk.n,
        e: jwk.e,
      },
    ],
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}
