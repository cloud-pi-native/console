import type { PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { BadRequestException } from '@nestjs/common'

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException(result.error.flatten())
    }

    return result.data
  }
}