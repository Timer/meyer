import sqlite3 from 'sqlite3';
import BaseDbms from '../src/dbms/BaseDbms';
import { Migration } from '../src/types';

export default class SqliteDbms extends BaseDbms {
  private _driver: sqlite3.Database;

  constructor(driver: sqlite3.Database) {
    super();
    this._driver = driver;
  }

  listMigrations = async (tableName: string): Promise<Migration[]> => {
    await this.exec(`create table if not exists "${tableName}" (
      id integer primary key,
      name text not null,
      up text not null,
      down text not null,
      checksum text not null
    )`);

    return this.all(
      `SELECT id, name, up, down, checksum FROM ${tableName} ORDER BY id ASC`
    );
  };

  applyMigration = async (
    tableName: string,
    migration: Migration,
    { checkEffects = false }: { checkEffects: boolean }
  ): Promise<void> => {
    await this.exec('BEGIN;');
    await this.exec(migration.up);
    if (checkEffects) {
      await this.exec(migration.down);
      await this.exec(migration.up);
    }
    await this.run(
      `INSERT INTO "${tableName}" (id, name, up, down, checksum) VALUES (?, ?, ?, ?, ?)`,
      [
        migration.id,
        migration.name,
        migration.up,
        migration.down,
        migration.checksum,
      ]
    );
    await this.exec('COMMIT;');
  };

  revertMigration = async (
    tableName: string,
    migration: Migration
  ): Promise<void> => {
    await this.exec('BEGIN;');
    await this.exec(migration.down);
    await this.run(`DELETE FROM "${tableName}" WHERE id = ?`, [migration.id]);
    await this.exec('COMMIT;');
  };

  run = (sql: string, params?: any[]): Promise<SqliteDbms> => {
    return new Promise((resolve, reject) => {
      this._driver.run(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  };

  all = (sql: string, params?: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      this._driver.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  };

  exec = (sql: string): Promise<SqliteDbms> => {
    return new Promise((resolve, reject) => {
      this._driver.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  };
}
