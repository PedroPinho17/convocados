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

// Os nomes dos índices e das FKs são os da migração AddPushTokens (escrita à mão):
// sem eles, `pnpm migration:check` veria diferenças só de nomes.
@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_push_tokens_userId' })
  user!: Relation<User>;

  @Index('IDX_push_tokens_userId')
  @Column()
  userId!: string;

  /** Token Expo Push (ex.: ExponentPushToken[...]). */
  @Index('IDX_push_tokens_token', { unique: true })
  @Column()
  token!: string;

  @Column({ type: 'varchar', nullable: true })
  platform!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
