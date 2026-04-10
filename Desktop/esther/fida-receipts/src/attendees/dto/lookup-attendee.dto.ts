import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class LookupAttendeeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;
}
