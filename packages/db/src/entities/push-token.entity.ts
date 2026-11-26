import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    Relation,
  } from 'typeorm';
  import { User } from './user.entity.js';
  
  @Entity('push_tokens')
  export class PushToken {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    user!: Relation<User>;
  
    @Index()
    @Column()
    userId!: string;
  
    /** Token Expo Push (ex.: ExponentPushToken[...]). */
    @Index({ unique: true })
    @Column()
    token!: string;
  
    @Column({ type: 'varchar', nullable: true })
    platform!: string | null;
  
    @CreateDateColumn()
    createdAt!: Date;
  }