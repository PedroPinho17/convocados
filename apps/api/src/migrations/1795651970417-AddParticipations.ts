import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParticipations1795651970417 implements MigrationInterface {
    name = 'AddParticipations1795651970417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "participations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "gameId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "status" character varying NOT NULL,
                "position" integer NOT NULL,
                "paid" boolean NOT NULL DEFAULT false,
                "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7aa63b8dcd3d6f8aef8a98bb14a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ce2b07ca71af768a008dae9b40" ON "participations" ("gameId", "status")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_79880a790171cb464fde165d42" ON "participations" ("gameId", "userId")
        `);
        await queryRunner.query(`
            ALTER TABLE "participations"
            ADD CONSTRAINT "FK_c2116d82ea743844f8308aaa571" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "participations"
            ADD CONSTRAINT "FK_b96d1e076744a3081adbb791c48" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "participations" DROP CONSTRAINT "FK_b96d1e076744a3081adbb791c48"
        `);
        await queryRunner.query(`
            ALTER TABLE "participations" DROP CONSTRAINT "FK_c2116d82ea743844f8308aaa571"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_79880a790171cb464fde165d42"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ce2b07ca71af768a008dae9b40"
        `);
        await queryRunner.query(`
            DROP TABLE "participations"
        `);
    }

}
