import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Campos acrescentados pelos utilizadores: quem escreve "Pavilhão da Escola X" à mão
 * não sabe as coordenadas. Os do OpenStreetMap continuam a tê-las sempre.
 */
export class UserVenues1795780000000 implements MigrationInterface {
  name = 'UserVenues1795780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "lat" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "lng" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "venues" WHERE "lat" IS NULL OR "lng" IS NULL`);
    await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "lng" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "venues" ALTER COLUMN "lat" SET NOT NULL`);
  }
}
