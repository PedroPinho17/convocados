import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVenues1795760000000 implements MigrationInterface {
  name = 'AddVenues1795760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "venues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "address" character varying(300),
        "city" character varying(120),
        "lat" double precision NOT NULL,
        "lng" double precision NOT NULL,
        "source" character varying(10) NOT NULL,
        "osmId" character varying(40),
        "sports" text array NOT NULL DEFAULT '{}',
        "surface" character varying(40),
        "createdById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venues_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_venues_osmId" ON "venues" ("osmId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_venues_lat_lng" ON "venues" ("lat", "lng")`,
    );
    await queryRunner.query(`
      ALTER TABLE "venues"
      ADD CONSTRAINT "FK_venues_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "venues" DROP CONSTRAINT "FK_venues_createdById"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_venues_lat_lng"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_venues_osmId"`);
    await queryRunner.query(`DROP TABLE "venues"`);
  }
}
