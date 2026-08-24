import type { PipeTransform } from '@nestjs/common'
import { BadRequestException } from '@nestjs/common'

// Schemas passed here may originate from @cpn-console/shared (zod 3) or from
// local zod 4 definitions. We only depend on the safeParse contract, so the
// param type stays version-agnostic to avoid a dual zod-major boundary.
interface SafeParseResult {
  success: boolean
  data?: unknown
  error?: { flatten: () => unknown }
}

interface SafeParseSchema {
  safeParse: (value: unknown) => SafeParseResult
}

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: SafeParseSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException(result.error?.flatten() ?? {})
    }

    return result.data
  }
}
