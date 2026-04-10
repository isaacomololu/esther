import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Member, SheetsService } from '../sheets/sheets.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';

@Injectable()
export class AttendeesService {
  constructor(private readonly sheets: SheetsService) {}

  async lookupByEmail(email: string): Promise<Member> {
    const member = await this.sheets.findByEmail(email);
    if (!member) {
      throw new NotFoundException('No member found with that email. Please register.');
    }
    return member;
  }

  async register(dto: CreateAttendeeDto): Promise<Member> {
    const existing = await this.sheets.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A member with that email is already registered.');
    }
    return this.sheets.appendMember({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      matric_no: dto.matric_no,
      level: dto.level,
      designation: dto.designation ?? 'Member',
      amount: '',
      paid_at: '',
      receipt_no: '',
    });
  }
}
