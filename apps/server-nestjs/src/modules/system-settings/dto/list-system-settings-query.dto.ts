import { IsOptional, IsString } from 'class-validator'

export class ListSystemSettingsQueryDto {
  @IsString()
  @IsOptional()
  key?: string
}
