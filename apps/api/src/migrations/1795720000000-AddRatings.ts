import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRatings1795720000000 implements MigrationInterface {
  name = 'AddRatings1795720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gameId" uuid NOT NULL,
        "fromUserId" uuid NOT NULL,
        "toUserId" uuid NOT NULL,
        "score" smallint NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ratings_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ratings_game_from_to"
      ON "ratings" ("gameId", "fromUserId", "toUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ratings_toUserId" ON "ratings" ("toUserId")
    `);
    await queryRunner.query(`
      ALTER TABLE "ratings"
      ADD CONSTRAINT "FK_ratings_gameId"
      FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ratings"
      ADD CONSTRAINT "FK_ratings_fromUserId"
      FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "ratings"
      ADD CONSTRAINT "FK_ratings_toUserId"
      FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_toUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_fromUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ratings" DROP CONSTRAINT "FK_ratings_gameId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ratings_toUserId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ratings_game_from_to"`);
    await queryRunner.query(`DROP TABLE "ratings"`);
  }
}
