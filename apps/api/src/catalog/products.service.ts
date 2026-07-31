import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { StockMovementReason } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateProductInput {
  businessId: string;
  name: string;
  sku?: string;
  unitPrice: number;
  taxRate?: number;
  quantityOnHand?: number;
  reorderPoint?: number;
  isService?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  unitPrice?: number;
  taxRate?: number;
  reorderPoint?: number;
  isService?: boolean;
  status?: string;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        businessId: input.businessId,
        name: input.name,
        sku: input.sku,
        unitPrice: input.unitPrice,
        taxRate: input.taxRate ?? 16,
        quantityOnHand: input.quantityOnHand ?? 0,
        reorderPoint: input.reorderPoint,
        isService: input.isService ?? false
      }
    });
  }

  async listForBusiness(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getOne(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(productId: string, input: UpdateProductInput) {
    await this.getOne(productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: { ...input, status: input.status as any }
    });
  }

  /**
   * The only way `quantityOnHand` ever changes — always paired with a
   * StockMovement row in the same transaction, so the running count can
   * never drift from its own audit trail.
   */
  async adjustStock(productId: string, delta: number, reason: StockMovementReason, note?: string) {
    const product = await this.getOne(productId);
    const newQuantity = Number(product.quantityOnHand) + delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        `This would leave ${product.name} at a negative quantity (${newQuantity}). Current stock: ${product.quantityOnHand}.`
      );
    }

    const [, movement] = await this.prisma.$transaction([
      this.prisma.product.update({ where: { id: productId }, data: { quantityOnHand: newQuantity } }),
      this.prisma.stockMovement.create({
        data: { productId, delta, reason: reason as any, note }
      })
    ]);

    return movement;
  }

  async listStockMovements(productId: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" }
    });
  }
}
