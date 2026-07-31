import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { RoleName } from "@relatax/types";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ContactService } from "./contact.service";
import { CreateContactInquiryDto } from "./dto/create-contact-inquiry.dto";

@ApiTags("contact")
@Controller()
export class ContactController {
  constructor(private contactService: ContactService) {}

  /** The public marketing site's "Contact us" form — no account needed. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("contact")
  create(@Body() dto: CreateContactInquiryDto) {
    return this.contactService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN)
  @Get("admin/contact-inquiries")
  listAll() {
    return this.contactService.listAll();
  }
}
