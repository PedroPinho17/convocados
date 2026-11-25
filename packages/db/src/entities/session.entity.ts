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
  
  @Entity('sessions')
  export class Session {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Index({ unique: true })
    @Column()
    tokenHash!: string;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    user!: Relation<User>;
  
    @Column()
    userId!: string;
  
    @Column({ type: 'timestamptz' })
    expiresAt!: Date;
  
    @CreateDateColumn()
    createdAt!: Date;
  }