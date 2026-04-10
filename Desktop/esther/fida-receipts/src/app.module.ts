import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SheetsModule } from './sheets/sheets.module';
import { AttendeesModule } from './attendees/attendees.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api/(.*)'],
    }),
    SheetsModule,
    AttendeesModule,
    PaymentsModule,
  ],
})
export class AppModule {}
