import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPartner = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partnerData = request.user; // Attached by PartnerApiKeyStrategy

    if (!partnerData) return null;
    return data ? partnerData[data] : partnerData.partner;
  },
);
