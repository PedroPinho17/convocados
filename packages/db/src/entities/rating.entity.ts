import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Game } from './game.entity.js';
import { User } from './user.entity.js';

/** Avaliação que um jogador dá a outro num jogo. Privada de quem a dá. */
@Entity('ratings')
@Index(['gameId', 'fromUserId', 'toUserId'], { unique: true })
@Index(['toUserId'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE', nullable: false })
  game!: Relation<Game>;

  @Column()
  gameId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  fromUser!: Relation<User>;

  @Column()
  fromUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  toUser!: Relation<User>;

  @Column()
  toUserId!: string;

  /** 1 (fraco) … 5 (muito forte). */
  @Column({ type: 'smallint' })
  score!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
