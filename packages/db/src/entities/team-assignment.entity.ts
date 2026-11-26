import { Column, Entity, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { Game } from './game.entity.js';
import { User } from './user.entity.js';

/** Equipas guardadas pelo organizador: uma linha por jogador e jogo. */
@Entity('teams')
export class TeamAssignment {
  @PrimaryColumn('uuid')
  gameId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  game!: Relation<Game>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: Relation<User>;

  /** A, B, C ou D. */
  @Column({ type: 'varchar', length: 1 })
  team!: string;
}
