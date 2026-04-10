import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateAttendeeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(trimLower)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  matric_no!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  level!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  designation?: string;
}
