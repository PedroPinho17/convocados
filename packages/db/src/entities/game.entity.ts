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
import { User } from './user.entity.js';
import { Group } from './group.entity.js';
import { Venue } from './venue.entity.js';

export type GameStatus = 'open' | 'cancelled' | 'done';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  organizer!: Relation<User>;

  @Column()
  organizerId!: string;

  @Column()
  title!: string;

  @Column()
  location!: string;

  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ type: 'int' })
  slots!: number;

  @Column({ type: 'int', default: 0 })
  subs!: number;

  /** Custo total do jogo (ex.: aluguer do campo). Cada um paga total ÷ jogadores. */
  @Column({ type: 'int', default: 0 })
  totalPriceCents!: number;

  @Index({ unique: true })
  @Column()
  inviteCode!: string;

  @Column({ type: 'varchar', default: 'open' })
  status!: GameStatus;

  @CreateDateColumn()
  createdAt!: Date;

  // Nomes das FKs e dos índices abaixo = os da migração GroupsSportsVenues (`pnpm migration:check`).

  /** football, futsal, padel, tennis, basketball, volleyball ou other. */
  @Column({ type: 'varchar', length: 20, default: 'football' })
  sport!: string;

  /** Grupo (tenant) a que o jogo pertence; sem grupo = jogo solto, só por convite. */
  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'groupId', foreignKeyConstraintName: 'FK_games_groupId' })
  group!: Relation<Group> | null;

  @Index('IDX_games_groupId')
  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null;

  /** Campo escolhido da lista; o "location" escrito continua a ser o que se mostra. */
  @ManyToOne(() => Venue, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'venueId', foreignKeyConstraintName: 'FK_games_venueId' })
  venue!: Relation<Venue> | null;

  @Column({ type: 'uuid', nullable: true })
  venueId!: string | null;
}
