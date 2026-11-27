import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfile1795790000000 implements MigrationInterface {
  name = 'UserProfile1795790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "preferredPosition" character varying(8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "preferredFoot" character varying(8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "city" character varying(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "bio" character varying(280)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "city"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "preferredFoot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "preferredPosition"`,
    );
  }
}
