import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /** Sempre em minúsculas (no AuthService, no 1.2). */
  @Column({ unique: true })
  email!: string;

  /** Nunca a password em claro. `select: false` = não vem em queries por defeito. */
  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  /** Lembretes antes de cada jogo, em minutos (por defeito, 2 horas antes). */
  @Column({ type: 'int', array: true, default: () => "'{120}'" })
  reminderMinutes!: number[];

  @CreateDateColumn()
  createdAt!: Date;
}