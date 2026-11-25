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
  
    @Column({ type: 'int', default: 0 })
    priceCents!: number;
  
    @Index({ unique: true })
    @Column()
    inviteCode!: string;
  
    @Column({ type: 'varchar', default: 'open' })
    status!: GameStatus;
  
    @CreateDateColumn()
    createdAt!: Date;
  }