import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFaceSearchScore1744991265059 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "face_search" ADD "score" double precision;`);
    await queryRunner.query(`CREATE INDEX "face_score_index" ON "face_search" ("score")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "face_search" DROP COLUMN "score";`);
    await queryRunner.query(`DROP INDEX "face_score_index";`);
  }
}
