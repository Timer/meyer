import sqlite3 from 'sqlite3'
import BaseDbms from '../src/dbms/BaseDbms'
import { Migration } from '../src/types'

export default class SqliteDbms extends BaseDbms {
  private _driver: sqlite3.Database

  constructor(driver: sqlite3.Database) {
    super()
    this._driver = driver
  }

  beginTransaction = async (): Promise<void> => {
    await this.exec('BEGIN;')
  }

  rollbackTransaction = async (): Promise<void> => {
    await this.exec('ROLLBACK;')
  }

  commitTransaction = async (): Promise<void> => {
    await this.exec('COMMIT;')
  }

  listMigrations = async (tableName: string): Promise<Migration[]> => {
    await this.exec(`create table if not exists "${tableName}" (
      id integer primary key,
      name text not null,
      up text not null,
      down text not null,
      checksum text not null
    )`)

    return await this.all(
      `SELECT id, name, up, down, checksum FROM ${tableName} ORDER BY id ASC`
    )
  }

  applyMigration = async (
    tableName: string,
    migration: Migration
  ): Promise<void> => {
    await this.exec(migration.up)
    await this.run(
      `INSERT INTO "${tableName}" (id, name, up, down, checksum) VALUES (?, ?, ?, ?, ?)`,
      [
        migration.id,
        migration.name,
        migration.up,
        migration.down,
        migration.checksum
      ]
    )
  }

  revertMigration = async (
    tableName: string,
    migration: Migration
  ): Promise<void> => {
    await this.exec(migration.down)
    await this.run(`DELETE FROM "${tableName}" WHERE id = ?`, [migration.id])
  }

  run = (sql: string, params?: any[]): Promise<SqliteDbms> => {
    return new Promise((resolve, reject) => {
      this._driver.run(sql, params, err => {
        if (err) {
          reject(err)
        } else {
          resolve(this)
        }
      })
    })
  }

  all = (sql: string, params?: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      this._driver.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  exec = (sql: string): Promise<SqliteDbms> => {
    return new Promise((resolve, reject) => {
      this._driver.exec(sql, err => {
        if (err) {
          reject(err)
        } else {
          resolve(this)
        }
      })
    })
  }
}
