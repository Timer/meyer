import Debug from 'debug';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Dbms, Migration } from './types';
import { checkSeries } from './util/series';

type MigrationFile = { id: number; name: string; filename: string };

type Options = {
  tableName?: string;
  migrationsPath: string;
  development?: boolean;
  dbms: Dbms;
};

const REGEX_ORDERED_SQL_FILE = /^(\d+).(.*?)\.sql$/;
const REGEX_MIGRATION_UP = /-- *up:begin(.*)-- *up:end/ims;
const REGEX_MIGRATION_DOWN = /-- *down:begin(.*)-- *down:end/ims;

export { default as BaseDbms } from './dbms/BaseDbms';
export { Dbms, Migration };

export default class Meyer {
  private tableName: string;
  private migrationsPath: string;
  private development: boolean;
  private debug: Debug.IDebugger;
  private dbms: Dbms;

  constructor({
    tableName = 'migrations',
    migrationsPath,
    development = false,
    dbms,
  }: Options) {
    this.tableName = tableName;
    this.migrationsPath = migrationsPath;
    this.development = development === true;
    this.debug = Debug('meyer');
    this.dbms = dbms;
  }

  private list = async (): Promise<MigrationFile[]> => {
    const migrationsPath = path.resolve(this.migrationsPath);
    this.debug(
      'resolving migrations in %s',
      path.relative(process.cwd(), migrationsPath)
    );

    const migrationFiles = await promisify(fs.readdir)(
      migrationsPath
    ).then((files) =>
      files.map((file) => file.match(REGEX_ORDERED_SQL_FILE)).filter(Boolean)
    );

    const migrations = migrationFiles
      .map((x) => ({
        filename: x![0],
        id: Number(x![1]),
        name: x![2],
      }))
      .sort((a, b) => Math.sign(a.id - b.id));

    this.debug('found %d migrations', migrations.length);

    return migrations;
  };

  private parse = async (migrations: MigrationFile[]): Promise<Migration[]> => {
    await checkSeries(migrations.map((m) => m.id));

    const content = await Promise.all(
      migrations.map(async (migration) => {
        const filename = path.join(
          path.resolve(this.migrationsPath),
          migration.filename
        );
        const data = await promisify(fs.readFile)(filename, 'utf-8');

        return { ...migration, data };
      })
    );

    content.forEach((migration) => {
      if (!REGEX_MIGRATION_UP.test(migration.data)) {
        throw new Error(
          `no up in migration ${migration.id} (${migration.name})`
        );
      }
      if (!REGEX_MIGRATION_DOWN.test(migration.data)) {
        throw new Error(
          `no down in migration ${migration.id} (${migration.name})`
        );
      }
    });

    const parsedMigrations = content.map((migration) => {
      const up = migration.data.match(REGEX_MIGRATION_UP)!.pop()!;
      const down = migration.data.match(REGEX_MIGRATION_DOWN)!.pop()!;
      return { id: migration.id, name: migration.name, up, down };
    });

    return Promise.all(
      parsedMigrations.map(async (migration) => {
        const checksum = await this.dbms.computeChecksum(migration);
        return { ...migration, checksum };
      })
    );
  };

  execute = async (): Promise<void> => {
    const files = await this.list();
    if (files.length < 1) {
      return;
    }

    const migrations = await this.parse(files);

    let appliedMigrations = await this.dbms.listMigrations(this.tableName);

    let firstMismatch = -1;
    for (const { id, checksum } of appliedMigrations) {
      const file = migrations.find((x) => x.id === id);
      if (
        (file == null || file.checksum !== checksum) &&
        (firstMismatch === -1 || id < firstMismatch)
      ) {
        firstMismatch = id;
      }
    }
    if (firstMismatch !== -1) {
      if (!this.development) {
        throw new Error(
          `... migration ${firstMismatch} has a hash mismatch, aborting ...`
        );
      }

      this.debug(
        `... migration ${firstMismatch} has a hash mismatch, rolling back ...`
      );

      const appliedSeries = appliedMigrations
        .map((m) => m.id)
        .sort((a, b) => Math.sign(b - a));
      for (const id of appliedSeries) {
        if (id < firstMismatch) {
          break;
        }

        this.debug(`rolling back migration ${id}`);
        await this.dbms.revertMigration(
          this.tableName,
          appliedMigrations.find((migration) => migration.id === id)!
        );
        appliedMigrations = appliedMigrations.filter((x) => x.id !== id);
      }
    }

    for (const migration of migrations) {
      if (appliedMigrations.find((a) => a.id === migration.id)) {
        continue;
      }

      this.debug(`applying migration ${migration.id}`);
      await this.dbms.applyMigration(this.tableName, migration, {
        checkEffects: this.development,
      });
    }

    await this.dbms.close();
  };
}
