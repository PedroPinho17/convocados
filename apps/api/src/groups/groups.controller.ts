import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createGroupSchema,
  type CreateGroupInput,
  type GroupDetailDto,
  type GroupDto,
  type GroupInviteDto,
  type UserDto,
} from '@convocados/shared';
import { CurrentUser, Public } from '../auth/auth.decorators.js';
import { GROUP_CODE_RE, GroupsService } from './groups.service.js';

const cleanCode = (raw: string) => {
  const code = raw.trim().toLowerCase();
  if (!GROUP_CODE_RE.test(code)) {
    throw new NotFoundException('Convite inválido ou grupo não encontrado.');
  }
  return code;
};

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(
    @CurrentUser() user: UserDto,
    @Body({ schema: createGroupSchema }) body: CreateGroupInput,
  ): Promise<GroupDto> {
    return this.groups.create(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: UserDto): Promise<GroupDto[]> {
    return this.groups.listMine(user.id);
  }

  /** Só membros. */
  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
  ): Promise<GroupDetailDto> {
    return this.groups.detail(id, user.id);
  }

  @Post(':id/leave')
  @HttpCode(204)
  async leave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserDto,
  ): Promise<void> {
    await this.groups.leave(id, user.id);
  }

  /** Só admins. */
  @Delete(':id/members/:userId')
  @HttpCode(204)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: UserDto,
  ): Promise<void> {
    await this.groups.removeMember(id, user.id, userId);
  }
}

/** Link de convite do grupo: /g/<código> na web. */
@Controller('group-invites')
export class GroupInvitesController {
  constructor(private readonly groups: GroupsService) {}

  /** Legível sem login (nome, desporto, nº de membros). Limite apertado contra adivinhar códigos. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':code')
  preview(@Param('code') raw: string): Promise<GroupInviteDto> {
    return this.groups.invitePreview(cleanCode(raw));
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':code/join')
  @HttpCode(200)
  join(
    @Param('code') raw: string,
    @CurrentUser() user: UserDto,
  ): Promise<GroupDto> {
    return this.groups.join(cleanCode(raw), user.id);
  }
}
