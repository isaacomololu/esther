import { Module } from '@nestjs/common';
import { SheetsModule } from '../sheets/sheets.module';
import { AttendeesController } from './attendees.controller';
import { AttendeesService } from './attendees.service';

@Module({
  imports: [SheetsModule],
  controllers: [AttendeesController],
  providers: [AttendeesService],
  exports: [AttendeesService],
})
export class AttendeesModule {}
