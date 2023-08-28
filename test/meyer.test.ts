import path from 'path';
import sqlite3 from 'sqlite3';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import Meyer from '../src';
import SqliteDbms from './SqliteDbms';

const noop = () => {};

describe('Meyer', () => {
  let meyer: Meyer;
  let db!: sqlite3.Database;
  let dbms!: SqliteDbms;
  beforeAll(() => {
    db = new sqlite3.Database(':memory:');
    dbms = new SqliteDbms(db);
  });

  test('can execute with nothing', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations'),
      dbms,
      development: true,
    });

    await meyer.execute();
  });

  test('creates an example table (dev)', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-01'),
      dbms,
      development: true,
    });

    await meyer.execute();
    expect(await dbms.all('SELECT * FROM "example";')).toMatchSnapshot();
  });

  test('creates an example table (prod)', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-01-prod'),
      dbms,
    });

    await meyer.execute();
    expect(await dbms.all('SELECT * FROM "example2";')).toMatchSnapshot();
  });

  test('can update the example table', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-01-v2'),
      dbms: dbms,
      development: true,
    });

    await meyer.execute();
    expect(await dbms.all('SELECT * FROM "example";')).toMatchSnapshot();
  });

  test('throws an error when changing non-development', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-01'),
      dbms,
      development: true,
    });

    await meyer.execute();
    expect(await dbms.all('SELECT * FROM "example";')).toMatchSnapshot();

    const changeNonDevelopment = async () => {
      meyer = new Meyer({
        migrationsPath: path.join(__dirname, './migrations-01-v2'),
        dbms,
        development: false,
      });
      await meyer.execute();
    };

    let err;
    await changeNonDevelopment().then(noop, (e) => (err = e));
    expect(err).toMatchSnapshot();
  });

  test('throws an error when up is missing', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-no-up'),
      dbms,
    });

    let err;
    await meyer.execute().then(noop, (e) => (err = e));
    expect(err).toMatchSnapshot();
  });

  test('throws an error when down is missing', async () => {
    meyer = new Meyer({
      migrationsPath: path.join(__dirname, './migrations-no-down'),
      dbms,
    });

    let err;
    await meyer.execute().then(noop, (e) => (err = e));
    expect(err).toMatchSnapshot();
  });

  afterAll(() => {
    db.close();
  });
});
