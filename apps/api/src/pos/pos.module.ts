import { Module } from "@nestjs/common";
import { MpesaTransportModule } from "./mpesa/mpesa-transport.module";
import { MpesaConnectionService } from "./mpesa/mpesa-connection.service";
import { MpesaConnectionController } from "./mpesa/mpesa-connection.controller";
import { SalesService } from "./sales.service";
import { ReceiptPdfService } from "./receipt-pdf.service";
import { PosController } from "./pos.controller";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [MpesaTransportModule, DocumentsModule],
  controllers: [MpesaConnectionController, PosController],
  providers: [MpesaConnectionService, SalesService, ReceiptPdfService],
  exports: [MpesaConnectionService, SalesService]
})
export class PosModule {}
