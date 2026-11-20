import type { HttpStatus } from '@nestjs/common'
import type { Response } from 'undici'

export class OpenCdsClientError extends Error {
  constructor(
    public readonly status: HttpStatus,
    public readonly statusText: string,
    public readonly body?: string,
  ) {
    super(`OpenCDS request failed with ${status} ${statusText}`)
    this.name = 'OpenCdsClientError'
  }
}

export async function throwIfNotOk<T extends Response>(response: T): Promise<void> {
  if (!response.ok) {
    const body = await response.text()
    throw new OpenCdsClientError(response.status, response.statusText, body)
  }
}
