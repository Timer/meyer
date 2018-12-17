export type Migration = {
  id: number
  name: string
  up: string
  down: string
  checksum: string
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export interface Dbms {
  beginTransaction(): Promise<void>
  rollbackTransaction(): Promise<void>
  commitTransaction(): Promise<void>

  listMigrations(tableName: string): Promise<Migration[]>
  applyMigration(tableName: string, migration: Migration): Promise<void>
  revertMigration(tableName: string, migration: Migration): Promise<void>
  computeChecksum(migration: Omit<Migration, 'checksum'>): Promise<string>
}
