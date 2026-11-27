import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameResultSummary1795800000000 implements MigrationInterface {
  name = 'GameResultSummary1795800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "games" ADD "scoreA" integer`);
    await queryRunner.query(`ALTER TABLE "games" ADD "scoreB" integer`);
    await queryRunner.query(
      `ALTER TABLE "games" ADD "summary" character varying(800)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "summary"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "scoreB"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "scoreA"`);
  }
}
