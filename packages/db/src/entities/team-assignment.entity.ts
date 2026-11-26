import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { Game } from './game.entity.js';
import { User } from './user.entity.js';

/**
 * Equipas guardadas pelo organizador: uma linha por jogador e jogo.
 * Nomes das FKs = os da migração AddTeams (ver `pnpm migration:check`).
 */
@Entity('teams')
export class TeamAssignment {
  @PrimaryColumn('uuid')
  gameId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId', foreignKeyConstraintName: 'FK_teams_gameId' })
  game!: Relation<Game>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_teams_userId' })
  user!: Relation<User>;

  /** A, B, C ou D. */
  @Column({ type: 'varchar', length: 1 })
  team!: string;
}
