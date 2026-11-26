import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Game } from './game.entity.js';
import { User } from './user.entity.js';

/**
 * Avaliação que um jogador dá a outro num jogo. Privada de quem a dá.
 * Nomes dos índices e das FKs = os da migração AddRatings (ver `pnpm migration:check`).
 */
@Entity('ratings')
@Index('IDX_ratings_game_from_to', ['gameId', 'fromUserId', 'toUserId'], {
  unique: true,
})
@Index('IDX_ratings_toUserId', ['toUserId'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'gameId', foreignKeyConstraintName: 'FK_ratings_gameId' })
  game!: Relation<Game>;

  @Column()
  gameId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'fromUserId',
    foreignKeyConstraintName: 'FK_ratings_fromUserId',
  })
  fromUser!: Relation<User>;

  @Column()
  fromUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'toUserId',
    foreignKeyConstraintName: 'FK_ratings_toUserId',
  })
  toUser!: Relation<User>;

  @Column()
  toUserId!: string;

  /** 1 (fraco) … 5 (muito forte). */
  @Column({ type: 'smallint' })
  score!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
