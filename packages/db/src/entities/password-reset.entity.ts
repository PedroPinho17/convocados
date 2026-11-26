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

/**
 * Pedidos para repor a password. Guarda-se só o hash do token do link (como nas sessões):
 * quem ler a base de dados não consegue usar os links.
 * Nomes = os da migração AddPasswordResets (`pnpm migration:check`).
 */
@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_password_resets_userId',
  })
  user!: Relation<User>;

  @Index('IDX_password_resets_userId')
  @Column()
  userId!: string;

  @Index('IDX_password_resets_tokenHash', { unique: true })
  @Column()
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  /** Preenchido quando o link é usado (ou anulado por um pedido mais recente). */
  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
