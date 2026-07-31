import { IsString } from "class-validator";

export class AttachEmployeeDocumentDto {
  @IsString()
  label!: string;
}
