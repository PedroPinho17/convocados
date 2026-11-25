import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessions1795622437573 implements MigrationInterface {
    name = 'AddSessions1795622437573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tokenHash" character varying NOT NULL,
                "userId" uuid NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_bace6c68efc156fddac9b14bda" ON "sessions" ("tokenHash")
        `);
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bace6c68efc156fddac9b14bda"
        `);
        await queryRunner.query(`
            DROP TABLE "sessions"
        `);
    }

}
