import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserDto } from '@convocados/shared';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type AuthedRequest = Request & {
  user?: UserDto;
  sessionTokenHash?: string;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserDto => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new Error('@CurrentUser() numa rota @Public()');
    return user;
  },
);