import { Injectable, NotFoundException } from "@nestjs/common";
import { randomInt } from "crypto";
import { DocumentCategory, EmployeeStatus } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";

export interface CreateEmployeeInput {
  businessId: string;
  name: string;
  email: string;
  kraPin?: string;
  nssfNo?: string;
  shifNo?: string;
  nationalId?: string;
  staffNo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  basicSalary: number;
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  kraPin?: string;
  nssfNo?: string;
  shifNo?: string;
  nationalId?: string;
  staffNo?: string;
  bankName?: string;
  bankAccountNumber?: string;
  basicSalary?: number;
  status?: EmployeeStatus;
}

const STAFF_NO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity

function randomStaffNoSuffix(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += STAFF_NO_ALPHABET[randomInt(STAFF_NO_ALPHABET.length)];
  return suffix;
}

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService
  ) {}

  async create(input: CreateEmployeeInput) {
    const staffNo = input.staffNo ?? (await this.generateStaffNo(input.businessId));
    return this.prisma.employee.create({ data: { ...input, staffNo } });
  }

  /** Generates a short, human-readable staff number, retrying on the rare collision within a business. */
  private async generateStaffNo(businessId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `EMP-${randomStaffNoSuffix()}`;
      const existing = await this.prisma.employee.findFirst({ where: { businessId, staffNo: candidate } });
      if (!existing) return candidate;
    }
    return `EMP-${randomStaffNoSuffix()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  }

  async listForBusiness(businessId: string) {
    return this.prisma.employee.findMany({
      where: { businessId },
      include: { documents: { include: { document: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async getOne(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { documents: { include: { document: true } } }
    });
    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  async update(employeeId: string, input: UpdateEmployeeInput) {
    await this.getOne(employeeId);
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { ...input, status: input.status as any }
    });
  }

  async attachDocument(employeeId: string, label: string, uploadedById: string, file: { originalName: string; mimeType: string; buffer: Buffer }) {
    const employee = await this.getOne(employeeId);

    const document = await this.documentsService.upload({
      businessId: employee.businessId,
      uploadedById,
      category: DocumentCategory.EMPLOYEE_RECORD,
      originalName: file.originalName,
      mimeType: file.mimeType,
      buffer: file.buffer
    });

    return this.prisma.employeeDocument.create({
      data: { employeeId, documentId: document.id, label, uploadedById },
      include: { document: true }
    });
  }
}
