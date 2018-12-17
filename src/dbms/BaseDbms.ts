import { Dbms, Migration } from '../types'
import eol from 'eol'
import crypto from 'crypto'

export default abstract class BaseDbms implements Dbms {
  computeChecksum(migration: Migration): Promise<string> {
    return Promise.resolve(
      crypto
        .createHash('sha512')
        .update(
          eol.lf(
            '$$__UP__$$\n' + migration.up + '$$__DOWN__$$\n' + migration.down
          )
        )
        .digest('hex')
    )
  }

  abstract listMigrations(tableName: string): Promise<Migration[]>
  abstract applyMigration(
    tableName: string,
    migration: Migration,
    opts: { checkEffects?: boolean }
  ): Promise<void>
  abstract revertMigration(
    tableName: string,
    migration: Migration
  ): Promise<void>
}
