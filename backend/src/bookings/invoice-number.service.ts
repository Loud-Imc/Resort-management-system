import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
    constructor(private prisma: PrismaService) {}

    /**
     * Get the Indian Financial Year string for a given date (e.g., "26-27" for FY 2026-2027).
     * In India, FY runs from April 1st to March 31st.
     */
    getFinancialYear(date: Date = new Date()): string {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = April

        if (month >= 3) {
            // April onwards belongs to currentYear - nextYear
            const startYearShort = String(year).slice(-2);
            const endYearShort = String(year + 1).slice(-2);
            return `${startYearShort}-${endYearShort}`;
        } else {
            // Jan, Feb, March belongs to prevYear - currentYear
            const startYearShort = String(year - 1).slice(-2);
            const endYearShort = String(year).slice(-2);
            return `${startYearShort}-${endYearShort}`;
        }
    }

    /**
     * Generate next sequential Tax Invoice / Bill of Supply number for a booking (e.g. INV/26-27/00001)
     */
    async generateNextInvoiceNumber(date: Date = new Date()): Promise<{ invoiceNumber: string; financialYear: string }> {
        const financialYear = this.getFinancialYear(date);
        const prefix = `INV/${financialYear}/`;

        // Find the latest booking with an invoice number in this financial year
        const latestBooking = await this.prisma.booking.findFirst({
            where: {
                invoiceNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                invoiceNumber: 'desc',
            },
            select: {
                invoiceNumber: true,
            },
        });

        let nextSeq = 1;
        if (latestBooking && latestBooking.invoiceNumber) {
            const parts = latestBooking.invoiceNumber.split('/');
            if (parts.length === 3) {
                const seq = parseInt(parts[2], 10);
                if (!isNaN(seq)) {
                    nextSeq = seq + 1;
                }
            }
        }

        const paddedSeq = String(nextSeq).padStart(5, '0');
        const invoiceNumber = `${prefix}${paddedSeq}`;

        return { invoiceNumber, financialYear };
    }

    /**
     * Generate next sequential Credit Note number (e.g. CN/26-27/00001)
     */
    async generateNextCreditNoteNumber(date: Date = new Date()): Promise<{ creditNoteNumber: string; financialYear: string }> {
        const financialYear = this.getFinancialYear(date);
        const prefix = `CN/${financialYear}/`;

        const latestCreditNote = await this.prisma.creditNote.findFirst({
            where: {
                creditNoteNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                creditNoteNumber: 'desc',
            },
            select: {
                creditNoteNumber: true,
            },
        });

        let nextSeq = 1;
        if (latestCreditNote && latestCreditNote.creditNoteNumber) {
            const parts = latestCreditNote.creditNoteNumber.split('/');
            if (parts.length === 3) {
                const seq = parseInt(parts[2], 10);
                if (!isNaN(seq)) {
                    nextSeq = seq + 1;
                }
            }
        }

        const paddedSeq = String(nextSeq).padStart(5, '0');
        const creditNoteNumber = `${prefix}${paddedSeq}`;

        return { creditNoteNumber, financialYear };
    }
}
