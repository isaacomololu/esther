import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Used when the attendee is ALREADY in the sheet — they just supply the
// missing matric_no and level alongside their email.
export class CreatePaymentDto {
  @Transform(trimLower)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

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
}
