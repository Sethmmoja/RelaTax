import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Grounds an AI answer in a business's actual current figures, not just the knowledge base. */
@Injectable()
export class BusinessFactsService {
  constructor(private prisma: PrismaService) {}

  async buildBusinessFacts(businessId: string): Promise<string[]> {
    const [taxes, unreadCount, documents] = await Promise.all([
      this.prisma.taxRecord.findMany({ where: { businessId }, orderBy: { dueDate: "asc" } }),
      this.prisma.notification.count({ where: { businessId, readAt: null } }),
      this.prisma.document.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    const due = taxes.filter((t) => t.status === "DUE");
    const paid = taxes.filter((t) => t.status === "PAID");
    const outstanding = taxes.filter((t) => t.status === "OUTSTANDING" || t.status === "PENALTY");
    const nextDue = due[0];

    const facts: string[] = [
      `Tax filings: ${due.length} due, ${paid.length} paid, ${outstanding.length} outstanding/penalty.`
    ];

    if (nextDue) {
      facts.push(
        `Next filing due: ${nextDue.taxType} — KES ${nextDue.amountDue.toString()} due ${nextDue.dueDate.toDateString()}.`
      );
    }

    if (outstanding.length > 0) {
      facts.push(
        `Outstanding/penalty filings: ${outstanding
          .map((t) => `${t.taxType} (KES ${t.amountDue.toString()}, due ${t.dueDate.toDateString()})`)
          .join("; ")}.`
      );
    }

    facts.push(`Unread notifications: ${unreadCount}.`);

    if (documents.length > 0) {
      facts.push(`Most recently uploaded documents: ${documents.map((d) => d.originalName).join(", ")}.`);
    }

    return facts;
  }
}
