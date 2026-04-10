import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Member, SheetsService } from '../sheets/sheets.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

export interface Receipt {
  receipt_no: string;
  name: string;
  matric_no: string;
  level: string;
  amount: string;
  currency: string;
  date: string;
  event_name: string;
  received_by_name: string;
  received_by_title: string;
  status: 'Payment Acknowledged';
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly sheets: SheetsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Marks an existing member as paid and returns a receipt. If the member is
   * already paid, the EXISTING receipt is returned — this guards against
   * double-charging on repeat scans.
   */
  async confirmPayment(dto: CreatePaymentDto): Promise<Receipt> {
    const member = await this.sheets.findByEmail(dto.email);
    if (!member) {
      throw new NotFoundException('No member found with that email. Please register first.');
    }

    if (member.paid && member.receipt_no) {
      return this.toReceipt(member);
    }

    const amount = String(this.config.get<string>('EVENT_AMOUNT') ?? '');
    const prefix = this.config.get<string>('RECEIPT_PREFIX') ?? 'FIDA-2026';
    const nextSeq = (await this.sheets.maxReceiptSequence(prefix)) + 1;
    const receiptNo = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    await this.sheets.updateRow(member.rowNumber, {
      matric_no: dto.matric_no,
      level: dto.level,
      amount,
      paid: 'TRUE',
      paid_at: nowIso,
      receipt_no: receiptNo,
    });

    return this.toReceipt({
      ...member,
      matric_no: dto.matric_no,
      level: dto.level,
      amount,
      paid: true,
      paid_at: nowIso,
      receipt_no: receiptNo,
    });
  }

  async getReceipt(receiptNo: string): Promise<Receipt> {
    const member = await this.sheets.findByReceiptNo(receiptNo);
    if (!member || !member.paid) {
      throw new NotFoundException('Receipt not found');
    }
    return this.toReceipt(member);
  }

  private toReceipt(m: Member): Receipt {
    return {
      receipt_no: m.receipt_no,
      name: m.name,
      matric_no: m.matric_no,
      level: m.level,
      amount: m.amount,
      currency: this.config.get<string>('EVENT_CURRENCY') ?? 'NGN',
      date: m.paid_at,
      event_name: this.config.get<string>('EVENT_NAME') ?? 'FIDA Event',
      received_by_name: this.config.get<string>('RECEIVED_BY_NAME') ?? 'Esther Nnabuife',
      received_by_title: this.config.get<string>('RECEIVED_BY_TITLE') ?? 'Financial Secretary',
      status: 'Payment Acknowledged',
    };
  }
}
