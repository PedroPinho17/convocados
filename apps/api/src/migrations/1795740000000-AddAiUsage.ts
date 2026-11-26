import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiUsage1795740000000 implements MigrationInterface {
  name = 'AddAiUsage1795740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "day" character varying(10) NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_ai_usage_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_usage_userId_day" UNIQUE ("userId", "day")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_usage_userId" ON "ai_usage" ("userId")
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_usage"
      ADD CONSTRAINT "FK_ai_usage_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_usage" DROP CONSTRAINT "FK_ai_usage_userId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_usage_userId"`);
    await queryRunner.query(`DROP TABLE "ai_usage"`);
  }
}
