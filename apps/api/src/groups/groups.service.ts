import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Game, Group, GroupMember } from '@convocados/db';
import type {
  CreateGroupInput,
  GameDto,
  GroupDetailDto,
  GroupDto,
  GroupInviteDto,
  GroupMemberDto,
  GroupRole,
  Sport,
} from '@convocados/shared';
import { toGameDto } from '../participations/participations.service.js';

/** 12 hex = 48 bits: curto para o link e impossível de adivinhar à força. */
export const GROUP_CODE_RE = /^[0-9a-f]{12}$/;
const newInviteCode = () => randomBytes(6).toString('hex');

type GroupRow = {
  id: string;
  name: string;
  sport: string;
  inviteCode: string;
  createdAt: Date;
  role: GroupRole;
  memberCount: number;
};

const toGroupDto = (r: GroupRow): GroupDto => ({
  id: r.id,
  name: r.name,
  sport: r.sport as Sport,
  inviteCode: r.inviteCode,
  role: r.role,
  memberCount: Number(r.memberCount),
  createdAt: new Date(r.createdAt).toISOString(),
});

/**
 * Grupos: o "tenant" da plataforma. Só os membros veem o grupo e os seus jogos
 * (na lista "os meus jogos"); entra-se pelo link de convite do grupo.
 */
@Injectable()
export class GroupsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(userId: string, input: CreateGroupInput): Promise<GroupDto> {
    const id = await this.dataSource.transaction(async (tx) => {
      const group = await tx.save(
        tx.create(Group, {
          name: input.name.trim(),
          sport: input.sport,
          inviteCode: newInviteCode(),
          createdById: userId,
        }),
      );
      await tx.insert(GroupMember, {
        groupId: group.id,
        userId,
        role: 'admin',
      });
      return group.id;
    });
    return (await this.findMine(userId, id))!;
  }

  listMine(userId: string): Promise<GroupDto[]> {
    return this.query(userId);
  }

  async detail(groupId: string, userId: string): Promise<GroupDetailDto> {
    const group = await this.findMine(userId, groupId);
    if (!group) await this.assertMember(groupId, userId); // 404 ou 403 com a mensagem certa

    const members: {
      userId: string;
      name: string;
      role: GroupRole;
      joinedAt: Date;
    }[] = await this.dataSource.query(
      `SELECT m."userId", u."name", m."role", m."joinedAt"
         FROM "group_members" m JOIN "users" u ON u."id" = m."userId"
         WHERE m."groupId" = $1
         ORDER BY (m."role" = 'admin') DESC, m."joinedAt"`,
      [groupId],
    );

    const games = await this.dataSource.manager.find(Game, {
      where: { groupId },
      relations: { group: true },
      order: { startsAt: 'DESC' },
      take: 60,
    });
    const now = Date.now();
    const upcoming = games.filter((g) => g.startsAt.getTime() >= now).reverse();
    const past = games.filter((g) => g.startsAt.getTime() < now);

    return {
      ...group!,
      members: members.map((m): GroupMemberDto => ({
        userId: m.userId,
        name: m.name,
        role: m.role,
        joinedAt: new Date(m.joinedAt).toISOString(),
      })),
      games: [...upcoming, ...past].map((g): GameDto => toGameDto(g)),
    };
  }

  /** O que se vê antes de entrar (público): nome, desporto e quantos membros tem. */
  async invitePreview(code: string): Promise<GroupInviteDto> {
    const rows: { name: string; sport: string; memberCount: number }[] =
      await this.dataSource.query(
        `SELECT g."name", g."sport",
                (SELECT count(*) FROM "group_members" m WHERE m."groupId" = g."id")::int AS "memberCount"
         FROM "groups" g WHERE g."inviteCode" = $1`,
        [code],
      );
    const row = rows[0];
    if (!row)
      throw new NotFoundException('Convite inválido ou grupo não encontrado.');
    return {
      name: row.name,
      sport: row.sport as Sport,
      memberCount: Number(row.memberCount),
    };
  }

  /** Entrar pelo link. Repetir não faz mal: quem já é membro fica como estava. */
  async join(code: string, userId: string): Promise<GroupDto> {
    const group = await this.dataSource.manager.findOneBy(Group, {
      inviteCode: code,
    });
    if (!group)
      throw new NotFoundException('Convite inválido ou grupo não encontrado.');
    await this.dataSource.query(
      `INSERT INTO "group_members" ("groupId", "userId", "role") VALUES ($1, $2, 'member')
       ON CONFLICT ("groupId", "userId") DO NOTHING`,
      [group.id, userId],
    );
    return (await this.findMine(userId, group.id))!;
  }

  async leave(groupId: string, userId: string): Promise<void> {
    await this.assertMember(groupId, userId);
    await this.dataSource.manager.delete(GroupMember, { groupId, userId });
    await this.repairAdmins();
  }

  /** Só admins; para sair do grupo usa-se "leave". */
  async removeMember(
    groupId: string,
    adminId: string,
    userId: string,
  ): Promise<void> {
    const role = await this.assertMember(groupId, adminId);
    if (role !== 'admin')
      throw new ForbiddenException('Só os admins podem remover membros.');
    if (userId === adminId)
      throw new BadRequestException(
        'Para saíres do grupo usa "Sair do grupo".',
      );
    const res = await this.dataSource.manager.delete(GroupMember, {
      groupId,
      userId,
    });
    if (!res.affected)
      throw new NotFoundException('Essa pessoa não é membro do grupo.');
  }

  /** Papel de quem pede; 404 se o grupo não existe, 403 se não é membro. */
  async assertMember(groupId: string, userId: string): Promise<GroupRole> {
    const member = await this.dataSource.manager.findOneBy(GroupMember, {
      groupId,
      userId,
    });
    if (member) return member.role;
    const exists = await this.dataSource.manager.existsBy(Group, {
      id: groupId,
    });
    if (!exists) throw new NotFoundException('Grupo não encontrado.');
    throw new ForbiddenException('Não és membro deste grupo.');
  }

  async memberIds(groupId: string): Promise<string[]> {
    const rows = await this.dataSource.manager.find(GroupMember, {
      where: { groupId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  /**
   * Depois de alguém sair (ou apagar a conta): grupos sem ninguém são apagados (os jogos
   * ficam, sem grupo) e grupos sem admin passam a ter como admin o membro mais antigo.
   */
  async repairAdmins(): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM "groups" g WHERE NOT EXISTS (SELECT 1 FROM "group_members" m WHERE m."groupId" = g."id")`,
    );
    await this.dataSource.query(
      `UPDATE "group_members" m SET "role" = 'admin'
       FROM (
         SELECT DISTINCT ON ("groupId") "groupId", "userId"
         FROM "group_members"
         WHERE "groupId" IN (
           SELECT "groupId" FROM "group_members" GROUP BY "groupId" HAVING bool_or("role" = 'admin') = false
         )
         ORDER BY "groupId", "joinedAt"
       ) first
       WHERE m."groupId" = first."groupId" AND m."userId" = first."userId"`,
    );
  }

  private async findMine(
    userId: string,
    groupId: string,
  ): Promise<GroupDto | null> {
    return (await this.query(userId, groupId))[0] ?? null;
  }

  private async query(userId: string, groupId?: string): Promise<GroupDto[]> {
    const rows: GroupRow[] = await this.dataSource.query(
      `SELECT g."id", g."name", g."sport", g."inviteCode", g."createdAt", me."role",
              (SELECT count(*) FROM "group_members" m WHERE m."groupId" = g."id")::int AS "memberCount"
       FROM "groups" g
       JOIN "group_members" me ON me."groupId" = g."id" AND me."userId" = $1
       WHERE ($2::uuid IS NULL OR g."id" = $2::uuid)
       ORDER BY g."createdAt" DESC`,
      [userId, groupId ?? null],
    );
    return rows.map(toGroupDto);
  }
}
