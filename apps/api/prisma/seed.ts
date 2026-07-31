import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_ROLE_PERMISSIONS, RoleName, PermissionAction, BusinessStatus, DocumentCategory, NotificationChannel, NotificationType, ReportSource, ReportType, TaxStatus, TaxType } from "@relatax/types";
import { hashEmbed, toVectorLiteral } from "../src/ai/embedding.util";

const prisma = new PrismaClient();

async function seedRbac() {
  for (const action of Object.values(PermissionAction)) {
    await prisma.permission.upsert({ where: { action }, create: { action }, update: {} });
  }

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {}
    });

    const grantedActions = DEFAULT_ROLE_PERMISSIONS[roleName];
    for (const action of grantedActions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { action } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {}
      });
    }
  }
}

async function seedStaff() {
  const passwordHash = await bcrypt.hash("RelaTax#2026", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@relatax.com" },
    create: { email: "admin@relatax.com", name: "Amara Otieno", passwordHash, isStaff: true },
    update: {}
  });
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  await prisma.roleAssignment.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    create: { userId: admin.id, roleId: superAdminRole.id },
    update: {}
  });

  const accountant = await prisma.user.upsert({
    where: { email: "accountant@relatax.com" },
    create: { email: "accountant@relatax.com", name: "Brian Kiplagat", passwordHash, isStaff: true },
    update: {}
  });
  const accountantRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.ACCOUNTANT } });
  await prisma.roleAssignment.upsert({
    where: { userId_roleId: { userId: accountant.id, roleId: accountantRole.id } },
    create: { userId: accountant.id, roleId: accountantRole.id },
    update: {}
  });

  return { admin, accountant, passwordHash };
}

async function seedClientAndBusinesses(passwordHash: string) {
  const client = await prisma.user.upsert({
    where: { email: "jane@acmefoods.co.ke" },
    create: { email: "jane@acmefoods.co.ke", phone: "+254712345678", name: "Jane Wanjiru", passwordHash },
    update: {}
  });

  const acme = await prisma.business.upsert({
    where: { id: "seed-business-acme" },
    create: {
      id: "seed-business-acme",
      name: "Acme Foods Ltd",
      brandColor: "#c96f4a",
      status: BusinessStatus.ACTIVE,
      members: { create: { userId: client.id, isOwner: true } }
    },
    update: {}
  });

  const zuri = await prisma.business.upsert({
    where: { id: "seed-business-zuri" },
    create: {
      id: "seed-business-zuri",
      name: "Zuri Logistics",
      brandColor: "#2f6f4f",
      status: BusinessStatus.ACTIVE,
      members: { create: { userId: client.id, isOwner: true } }
    },
    update: {}
  });

  return { client, businesses: [acme, zuri] };
}

/**
 * accountant@relatax.com is assigned to Acme only (not Zuri), so local
 * testing can exercise both the "assigned -> allowed" and "unassigned -> 403"
 * paths without any manual setup. admin@relatax.com (SUPER_ADMIN) needs no
 * assignment rows since it bypasses this check entirely.
 */
async function seedStaffAssignments(accountantId: string, acmeBusinessId: string) {
  await prisma.staffBusinessAssignment.upsert({
    where: { userId_businessId: { userId: accountantId, businessId: acmeBusinessId } },
    create: { userId: accountantId, businessId: acmeBusinessId },
    update: {}
  });
}

async function seedReportsAndTaxes(businessId: string, hasEmployees = false) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric" });

  const period = await prisma.reportPeriod.upsert({
    where: { id: `${businessId}-${label}` },
    create: { id: `${businessId}-${label}`, businessId, label, startDate: start, endDate: end },
    update: {}
  });

  for (const type of [ReportType.PROFIT_AND_LOSS, ReportType.VAT]) {
    await prisma.financialReport.upsert({
      where: { id: `${period.id}-${type}` },
      create: { id: `${period.id}-${type}`, periodId: period.id, type, source: ReportSource.MANUAL },
      update: {}
    });
  }

  await prisma.taxRecord.upsert({
    where: { id: `${businessId}-vat-${label}` },
    create: {
      id: `${businessId}-vat-${label}`,
      businessId,
      periodId: period.id,
      taxType: TaxType.VAT,
      status: TaxStatus.DUE,
      amountDue: new Prisma.Decimal(48250),
      amountPaid: new Prisma.Decimal(0),
      penalty: new Prisma.Decimal(0),
      dueDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 20))
    },
    update: {}
  });

  await prisma.notification.create({
    data: {
      businessId,
      type: NotificationType.FILING_REMINDER,
      channels: [NotificationChannel.PORTAL, NotificationChannel.WHATSAPP],
      title: "VAT filing due soon",
      body: `Your VAT return for ${label} is due on the 20th. Amount due: KES 48,250.`
    }
  });

  // Statutory deductions only apply to businesses with employees on payroll.
  if (hasEmployees) {
    const statutoryDueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 9));
    const statutories = [
      { type: TaxType.PAYE, amountDue: 96400, status: TaxStatus.DUE },
      { type: TaxType.NSSF, amountDue: 21600, status: TaxStatus.DUE },
      { type: TaxType.SHIF, amountDue: 15200, status: TaxStatus.PAID },
      { type: TaxType.HOUSING_LEVY, amountDue: 9840, status: TaxStatus.PAID }
    ];

    for (const s of statutories) {
      await prisma.taxRecord.upsert({
        where: { id: `${businessId}-${s.type.toLowerCase()}-${label}` },
        create: {
          id: `${businessId}-${s.type.toLowerCase()}-${label}`,
          businessId,
          periodId: period.id,
          taxType: s.type,
          status: s.status,
          amountDue: new Prisma.Decimal(s.amountDue),
          amountPaid: new Prisma.Decimal(s.status === TaxStatus.PAID ? s.amountDue : 0),
          penalty: new Prisma.Decimal(0),
          dueDate: statutoryDueDate
        },
        update: {}
      });
    }
  }
}

async function seedKnowledgeBase() {
  const publicArticles = [
    "RelaTax provides fractional accounting, tax compliance and payroll services for ambitious businesses across Kenya and East Africa.",
    "VAT in Kenya is generally due by the 20th of the month following the taxable period, filed via iTax.",
    "PAYE (Pay As You Earn) is deducted monthly from employee salaries and remitted to KRA by the 9th of the following month.",
    "RelaTax's fractional accounting model gives you senior finance expertise on demand, without the cost of a full-time hire."
  ];

  for (const content of publicArticles) {
    const id = randomUUID();
    const vector = toVectorLiteral(hashEmbed(content));
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO knowledge_base_chunks (id, "businessId", "sourceType", "sourceRef", content, embedding, "createdAt")
      VALUES (${id}, NULL, 'kb_article', NULL, ${content}, ${vector}::vector, now())
      ON CONFLICT (id) DO NOTHING
    `);
  }
}

async function main() {
  await seedRbac();
  const { accountant, passwordHash } = await seedStaff();
  const { businesses } = await seedClientAndBusinesses(passwordHash);
  for (const business of businesses) {
    await seedReportsAndTaxes(business.id, business.id === businesses[0].id);
  }
  await seedStaffAssignments(accountant.id, businesses[0].id);
  await seedKnowledgeBase();

  // eslint-disable-next-line no-console
  console.log("Seed complete. Client login: jane@acmefoods.co.ke / RelaTax#2026 (phone +254712345678)");
  // eslint-disable-next-line no-console
  console.log("Admin login: admin@relatax.com / RelaTax#2026");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
