import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushTokens1795700000000 implements MigrationInterface {
  name = 'AddPushTokens1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "platform" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_tokens_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_push_tokens_userId" ON "push_tokens" ("userId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_push_tokens_token" ON "push_tokens" ("token")
    `);
    await queryRunner.query(`
      ALTER TABLE "push_tokens"
      ADD CONSTRAINT "FK_push_tokens_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_userId"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_push_tokens_token"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_push_tokens_userId"
    `);
    await queryRunner.query(`
      DROP TABLE "push_tokens"
    `);
  }
}
