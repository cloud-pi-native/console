import { IsNotEmpty, IsString } from 'class-validator'

export class SystemSettingDto {
  @IsString()
  @IsNotEmpty()
  value!: string
}
