import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { AdjustStockDto } from "./dto/adjust-stock.dto";

@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(BusinessMemberGuard)
@Controller("businesses/:businessId/products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  create(@Param("businessId") businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create({ businessId, ...dto });
  }

  @Get()
  list(@Param("businessId") businessId: string) {
    return this.productsService.listForBusiness(businessId);
  }

  @Patch(":productId")
  update(@Param("productId") productId: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(productId, dto);
  }

  @Post(":productId/stock-adjustments")
  adjustStock(@Param("productId") productId: string, @Body() dto: AdjustStockDto) {
    return this.productsService.adjustStock(productId, dto.delta, dto.reason, dto.note);
  }

  @Get(":productId/stock-adjustments")
  listStockMovements(@Param("productId") productId: string) {
    return this.productsService.listStockMovements(productId);
  }
}
