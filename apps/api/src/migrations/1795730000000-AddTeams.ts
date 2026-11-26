import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeams1795730000000 implements MigrationInterface {
  name = 'AddTeams1795730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "gameId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "team" character varying(1) NOT NULL,
        CONSTRAINT "PK_teams_game_user" PRIMARY KEY ("gameId", "userId")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "teams"
      ADD CONSTRAINT "FK_teams_gameId"
      FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "teams"
      ADD CONSTRAINT "FK_teams_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_gameId"`,
    );
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
