import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserReminders1795710000000 implements MigrationInterface {
  name = 'UserReminders1795710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reminderMinutes" integer array NOT NULL DEFAULT '{120}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reminderMinutes"`,
    );
  }
}
