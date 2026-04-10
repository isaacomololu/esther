import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  async confirm(@Body() dto: CreatePaymentDto) {
    const receipt = await this.payments.confirmPayment(dto);
    return { message: 'Payment acknowledged', data: receipt };
  }

  @Get('receipts/:receiptNo')
  async getReceipt(@Param('receiptNo') receiptNo: string) {
    const receipt = await this.payments.getReceipt(receiptNo);
    return { message: 'Receipt found', data: receipt };
  }
}
