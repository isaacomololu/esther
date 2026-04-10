import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AttendeesService } from './attendees.service';
import { LookupAttendeeDto } from './dto/lookup-attendee.dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';

@Controller('attendees')
export class AttendeesController {
  constructor(private readonly attendees: AttendeesService) {}

  @Get('lookup')
  async lookup(@Query() query: LookupAttendeeDto) {
    const member = await this.attendees.lookupByEmail(query.email);
    return { message: 'Member found', data: member };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateAttendeeDto) {
    const member = await this.attendees.register(dto);
    return { message: 'Member registered', data: member };
  }
}
