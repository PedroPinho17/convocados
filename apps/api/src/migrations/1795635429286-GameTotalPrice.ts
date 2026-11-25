import { MigrationInterface, QueryRunner } from "typeorm";

/** O jogo passa a guardar o custo total; o valor por pessoa é calculado (total ÷ jogadores). */
export class GameTotalPrice1795635429286 implements MigrationInterface {
    name = 'GameTotalPrice1795635429286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "games" RENAME COLUMN "priceCents" TO "totalPriceCents"
        `);
        // Jogos antigos guardavam o valor por pessoa, calculado com vagas + suplentes.
        await queryRunner.query(`
            UPDATE "games" SET "totalPriceCents" = "totalPriceCents" * ("slots" + "subs")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "games" SET "totalPriceCents" = CEIL("totalPriceCents"::numeric / GREATEST("slots" + "subs", 1))
        `);
        await queryRunner.query(`
            ALTER TABLE "games" RENAME COLUMN "totalPriceCents" TO "priceCents"
        `);
    }

}
