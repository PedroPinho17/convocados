import { MigrationInterface, QueryRunner } from 'typeorm';

/** Grupos (tenants), desporto de cada jogo, e o campo escolhido da lista. */
export class GroupsSportsVenues1795770000000 implements MigrationInterface {
  name = 'GroupsSportsVenues1795770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(60) NOT NULL,
        "sport" character varying(20) NOT NULL,
        "inviteCode" character varying(16) NOT NULL,
        "createdById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_groups_inviteCode" ON "groups" ("inviteCode")`,
    );
    await queryRunner.query(`
      ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "groupId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" character varying(10) NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_members" PRIMARY KEY ("groupId", "userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_group_members_userId" ON "group_members" ("userId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_groupId"
      FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `ALTER TABLE "games" ADD "sport" character varying(20) NOT NULL DEFAULT 'football'`,
    );
    await queryRunner.query(`ALTER TABLE "games" ADD "groupId" uuid`);
    await queryRunner.query(`ALTER TABLE "games" ADD "venueId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_games_groupId" ON "games" ("groupId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "games" ADD CONSTRAINT "FK_games_groupId"
      FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "games" ADD CONSTRAINT "FK_games_venueId"
      FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_games_venueId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_games_groupId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_games_groupId"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "venueId"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "groupId"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "sport"`);
    await queryRunner.query(
      `ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_groupId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_group_members_userId"`);
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(
      `ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_createdById"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_groups_inviteCode"`);
    await queryRunner.query(`DROP TABLE "groups"`);
  }
}
