import { Injectable } from '@nestjs/common'

@Injectable()
export class VaultService {
  getProjectValues(_projectId: string): Promise<Record<string, any>> {
    throw new Error('Method not implemented.')
  }
}
