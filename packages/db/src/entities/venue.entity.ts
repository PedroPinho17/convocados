import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

export type VenueSource = 'osm' | 'user';

/**
 * Um sítio onde se joga: complexo, pavilhão, estádio ou campo.
 * - source "osm": importado do OpenStreetMap (osmId = "way/123"; reimportar atualiza-o);
 * - source "user": acrescentado por um utilizador (osmId vazio).
 * Nomes do índice e das FKs = os da migração AddVenues (`pnpm migration:check`).
 */
@Entity('venues')
@Index('IDX_venues_lat_lng', ['lat', 'lng'])
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** Rua, número e código postal, quando se sabem. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city!: string | null;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ type: 'varchar', length: 10 })
  source!: VenueSource;

  /** Ex.: "way/106873524". Único; vários NULL são permitidos (os dos utilizadores). */
  @Index('IDX_venues_osmId', { unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  osmId!: string | null;

  /** Ex.: ["futsal", "soccer"]. Valores do OSM, normalizados (futebol → soccer). */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  sports!: string[];

  /** Ex.: "artificial_turf", "grass", "acrylic". */
  @Column({ type: 'varchar', length: 40, nullable: true })
  surface!: string | null;

  /** Quem acrescentou (só nos "user"). Se a conta for apagada, o local fica. */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'createdById',
    foreignKeyConstraintName: 'FK_venues_createdById',
  })
  createdBy!: Relation<User> | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
