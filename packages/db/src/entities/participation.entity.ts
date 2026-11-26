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
  
  export type ParticipationStatus = 'confirmed' | 'waiting' | 'left';
  
  @Entity('participations')
  @Index(['gameId', 'userId'], { unique: true })
  @Index(['gameId', 'status'])
  export class Participation {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @ManyToOne(() => Game, { onDelete: 'CASCADE', nullable: false })
    game!: Relation<Game>;
  
    @Column()
    gameId!: string;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
    user!: Relation<User>;
  
    @Column()
    userId!: string;
  
    /** confirmed = vaga; waiting = lista de espera; left = desistiu */
    @Column({ type: 'varchar' })
    status!: ParticipationStatus;
  
    /** Ordem na lista (confirmados e espera). Serve para promover o 1.º da fila. */
    @Column({ type: 'int' })
    position!: number;
  
    /** Fase 4 (pagamentos). Já nasce aqui para não mudar o schema depois. */
    @Column({ type: 'boolean', default: false })
    paid!: boolean;
  
    @CreateDateColumn({ type: 'timestamptz' })
    joinedAt!: Date;
  }