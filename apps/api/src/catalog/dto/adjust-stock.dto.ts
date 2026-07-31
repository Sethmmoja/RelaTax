import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { StockMovementReason } from "@relatax/types";

export class AdjustStockDto {
  /** Positive to add stock, negative to remove — e.g. a restock is +10, a breakage correction is -2. */
  @IsNumber()
  delta!: number;

  @IsEnum(StockMovementReason)
  reason!: StockMovementReason;

  @IsOptional()
  @IsString()
  note?: string;
}
