import { IsString } from "class-validator";

export class SimulateInboundDto {
  @IsString()
  phone!: string;

  @IsString()
  message!: string;
}
