import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1795621974591 implements MigrationInterface {
    name = 'Init1795621974591'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "avatarUrl" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "games" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organizerId" uuid NOT NULL,
                "title" character varying NOT NULL,
                "location" character varying NOT NULL,
                "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "slots" integer NOT NULL,
                "subs" integer NOT NULL DEFAULT '0',
                "priceCents" integer NOT NULL DEFAULT '0',
                "inviteCode" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'open',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_bca4cc847d717ae966e78a178b" ON "games" ("inviteCode")
        `);
        await queryRunner.query(`
            ALTER TABLE "games"
            ADD CONSTRAINT "FK_af3c141dbe5df5da0c4b9edb16c" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "games" DROP CONSTRAINT "FK_af3c141dbe5df5da0c4b9edb16c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bca4cc847d717ae966e78a178b"
        `);
        await queryRunner.query(`
            DROP TABLE "games"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
    }

}
