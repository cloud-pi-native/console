import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe'

describe('zodValidationPipe', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  })

  let pipe: ZodValidationPipe

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema)
  })

  describe('transform', () => {
    it('should return validated data when input is valid', () => {
      const validInput = {
        name: 'Alice',
        age: 30,
      }

      const result = pipe.transform(validInput)

      expect(result).toEqual(validInput)
    })

    it('should strip unknown fields if schema does not allow them', () => {
      const input = {
        name: 'Alice',
        age: 30,
        extra: 'remove me',
      }

      const result = pipe.transform(input)

      expect(result).toEqual({
        name: 'Alice',
        age: 30,
      })
    })

    it('should throw BadRequestException when required fields are missing', () => {
      const invalidInput = {
        name: 'Alice',
      }

      expect(() => pipe.transform(invalidInput)).toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException when field types are invalid', () => {
      const invalidInput = {
        name: 'Alice',
        age: '30',
      }

      expect(() => pipe.transform(invalidInput)).toThrow(
        BadRequestException,
      )
    })

    it('should include flattened Zod errors in the exception response', () => {
      const invalidInput = {
        name: 123,
        age: -5,
      }

      try {
        pipe.transform(invalidInput)
        throw new Error('Expected transform to throw')
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException)

        if (error instanceof BadRequestException) {
          const response = error.getResponse() as any

          expect(response).toHaveProperty('fieldErrors')
          expect(response.fieldErrors).toHaveProperty('name')
          expect(response.fieldErrors).toHaveProperty('age')
        }
      }
    })

    it('should throw when input is null', () => {
      expect(() => pipe.transform(null)).toThrow(
        BadRequestException,
      )
    })

    it('should throw when input is undefined', () => {
      expect(() => pipe.transform(undefined)).toThrow(
        BadRequestException,
      )
    })
  })
})
