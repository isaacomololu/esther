import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';

// Canonical column order in the Google Sheet. Row 1 in the sheet must match.
export const SHEET_COLUMNS = [
  'id',
  'name',
  'designation',
  'phone',
  'email',
  'matric_no',
  'level',
  'amount',
  'paid',
  'paid_at',
  'receipt_no',
  'created_at',
] as const;

export type SheetColumn = (typeof SHEET_COLUMNS)[number];

export interface Member {
  id: number;
  name: string;
  designation: string;
  phone: string;
  email: string;
  matric_no: string;
  level: string;
  amount: string;
  paid: boolean;
  paid_at: string;
  receipt_no: string;
  created_at: string;
  // 1-based sheet row (including header), used for targeted updates.
  rowNumber: number;
}

@Injectable()
export class SheetsService implements OnModuleInit {
  private readonly logger = new Logger(SheetsService.name);
  private sheets!: sheets_v4.Sheets;
  private sheetId!: string;
  private tab!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const clientEmail = this.requireEnv('GOOGLE_CLIENT_EMAIL');
    const privateKey = this.requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
    this.sheetId = this.requireEnv('SHEET_ID');
    this.tab = this.config.get<string>('SHEET_TAB') ?? 'Members';

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.logger.log(`Sheets client ready (tab="${this.tab}")`);
  }

  private requireEnv(name: string): string {
    const v = this.config.get<string>(name);
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
  }

  private get range(): string {
    // Pull the full 12-column range. A1:L catches every row including blanks.
    return `${this.tab}!A1:L`;
  }

  /** Load every member in the sheet (returns empty array if only header exists). */
  async getAll(): Promise<Member[]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: this.range,
    });
    const rows = res.data.values ?? [];
    if (rows.length <= 1) return [];
    return rows.slice(1).map((row, idx) => this.parseRow(row, idx + 2));
  }

  async findByEmail(email: string): Promise<Member | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    const all = await this.getAll();
    return all.find((m) => m.email.trim().toLowerCase() === normalized) ?? null;
  }

  async findByReceiptNo(receiptNo: string): Promise<Member | null> {
    const all = await this.getAll();
    return all.find((m) => m.receipt_no === receiptNo) ?? null;
  }

  /** Append a new member row. Returns the new member with its assigned id + rowNumber. */
  async appendMember(
    member: Omit<Member, 'id' | 'rowNumber' | 'paid' | 'created_at'> & { created_at?: string },
  ): Promise<Member> {
    const all = await this.getAll();
    const nextId = all.reduce((max, m) => (m.id > max ? m.id : max), 0) + 1;
    const createdAt = member.created_at ?? new Date().toISOString();
    const row = this.toRow({
      id: nextId,
      name: member.name,
      designation: member.designation || 'Member',
      phone: member.phone,
      email: member.email,
      matric_no: member.matric_no,
      level: member.level,
      amount: member.amount || '',
      paid: false,
      paid_at: member.paid_at || '',
      receipt_no: member.receipt_no || '',
      created_at: createdAt,
      rowNumber: -1,
    });

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: this.range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    // Re-read to discover the actual rowNumber the sheet assigned.
    const found = (await this.getAll()).find((m) => m.id === nextId);
    if (!found) throw new Error('Append succeeded but new row not found on re-read');
    return found;
  }

  /**
   * Apply a patch to a specific row. Only keys in `updates` are written —
   * other cells are left untouched.
   */
  async updateRow(rowNumber: number, updates: Partial<Record<SheetColumn, string>>): Promise<void> {
    const data: sheets_v4.Schema$ValueRange[] = Object.entries(updates).map(([key, value]) => {
      const colIdx = SHEET_COLUMNS.indexOf(key as SheetColumn);
      if (colIdx < 0) throw new Error(`Unknown sheet column: ${key}`);
      const colLetter = String.fromCharCode(65 + colIdx); // A..L
      return {
        range: `${this.tab}!${colLetter}${rowNumber}`,
        values: [[value ?? '']],
      };
    });

    if (data.length === 0) return;
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: { valueInputOption: 'RAW', data },
    });
  }

  /** Highest numeric suffix across existing receipt numbers, or 0 if none. */
  async maxReceiptSequence(prefix: string): Promise<number> {
    const all = await this.getAll();
    let max = 0;
    for (const m of all) {
      if (!m.receipt_no.startsWith(`${prefix}-`)) continue;
      const tail = m.receipt_no.slice(prefix.length + 1);
      const n = parseInt(tail, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max;
  }

  private parseRow(row: string[], rowNumber: number): Member {
    const get = (col: SheetColumn) => row[SHEET_COLUMNS.indexOf(col)] ?? '';
    const idRaw = get('id');
    return {
      id: parseInt(idRaw, 10) || 0,
      name: get('name'),
      designation: get('designation'),
      phone: get('phone'),
      email: get('email'),
      matric_no: get('matric_no'),
      level: get('level'),
      amount: get('amount'),
      paid: get('paid').toUpperCase() === 'TRUE',
      paid_at: get('paid_at'),
      receipt_no: get('receipt_no'),
      created_at: get('created_at'),
      rowNumber,
    };
  }

  private toRow(m: Member): string[] {
    return [
      String(m.id),
      m.name,
      m.designation,
      m.phone,
      m.email,
      m.matric_no,
      m.level,
      m.amount,
      m.paid ? 'TRUE' : 'FALSE',
      m.paid_at,
      m.receipt_no,
      m.created_at,
    ];
  }
}
