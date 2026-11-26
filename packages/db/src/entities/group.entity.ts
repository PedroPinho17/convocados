import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * Um grupo é o "tenant" da plataforma: uma futebolada, um grupo de padel, uma equipa.
 * Tem membros, um desporto principal e os seus jogos (games.groupId).
 * Nomes = os da migração GroupsSportsVenues (`pnpm migration:check`).
 */
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  sport!: string;

  /** Código do link de convite (/g/<código>). */
  @Index('IDX_groups_inviteCode', { unique: true })
  @Column({ type: 'varchar', length: 16 })
  inviteCode!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'createdById',
    foreignKeyConstraintName: 'FK_groups_createdById',
  })
  createdBy!: Relation<User> | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

export type GroupRole = 'admin' | 'member';

/** Quem pertence a cada grupo e com que papel (admin pode remover membros). */
@Entity('group_members')
export class GroupMember {
  @PrimaryColumn('uuid')
  groupId!: string;

  @Index('IDX_group_members_userId')
  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'groupId',
    foreignKeyConstraintName: 'FK_group_members_groupId',
  })
  group!: Relation<Group>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_group_members_userId',
  })
  user!: Relation<User>;

  @Column({ type: 'varchar', length: 10, default: 'member' })
  role!: GroupRole;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
