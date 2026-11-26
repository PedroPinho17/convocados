import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResets1795750000000 implements MigrationInterface {
  name = 'AddPasswordResets1795750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_resets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_password_resets_userId" ON "password_resets" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_password_resets_tokenHash" ON "password_resets" ("tokenHash")`,
    );
    await queryRunner.query(`
      ALTER TABLE "password_resets"
      ADD CONSTRAINT "FK_password_resets_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_resets" DROP CONSTRAINT "FK_password_resets_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_password_resets_tokenHash"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_password_resets_userId"`);
    await queryRunner.query(`DROP TABLE "password_resets"`);
  }
}
