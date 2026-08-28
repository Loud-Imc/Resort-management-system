import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPartner = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partnerData = request.user; // Attached by PartnerApiKeyGuard

    if (!partnerData) return null;
    return data ? partnerData[data] : partnerData.partner;
  },
);

export const CurrentCredential = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partnerData = request.user;

    if (!partnerData) return null;
    return data ? partnerData.credential?.[data] : partnerData.credential;
  },
);
