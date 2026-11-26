import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * Quantos pedidos de IA cada utilizador fez em cada dia (UTC).
 * Nomes do índice, da unicidade e da FK = os da migração AddAiUsage (`pnpm migration:check`).
 */
@Entity('ai_usage')
@Unique('UQ_ai_usage_userId_day', ['userId', 'day'])
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_ai_usage_userId',
  })
  user!: Relation<User>;

  @Index('IDX_ai_usage_userId')
  @Column()
  userId!: string;

  /** Dia UTC no formato AAAA-MM-DD. */
  @Column({ type: 'varchar', length: 10 })
  day!: string;

  @Column({ type: 'int', default: 0 })
  count!: number;
}
