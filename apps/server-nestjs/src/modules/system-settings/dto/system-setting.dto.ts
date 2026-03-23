import { IsNotEmpty, IsString } from 'class-validator'

export class SystemSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string

  @IsString()
  @IsNotEmpty()
  value!: string
}
