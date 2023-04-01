# `meyer`

**meyer** is a database migration tool with inversion of control (via pluggable DBMS).

Meyer supports sequentially named plain SQL files which apply migrations one after another. An UP and DOWN section is specified in each file which should provide all the necessary instructions on how to both apply and remove a migration. While your project is in development, Meyer will freely apply statements in the DOWN if prior migrations are modified.

## Installation

Install meyer into your project using your package manager:

```
yarn add meyer
```

Additionally, you will need to add a DBMS. We have created both a generic [Knex DBMS](https://github.com/Timer/meyer-dbms-knex) and an [MSSQL DBMS](https://github.com/Timer/meyer-dbms-mssql).

Install one of these options:

```
yarn add meyer-dbms-knex
```

or

```
yarn add meyer-dbms-mssql
```

## Usage

Here is an example of how you could use meyer to apply migrations to your database. Note that this example assumes you're using postgres and `meyer-dbms-knex`. It also relies on having `pg-connection-string` installed. You can install it with the following command: `yarn add pg-connection-string`. Finally, it assumes that you are storing the connection string to your database in an environment variable named `DATABASE_URL`. You can use `dotenv` if you want to load it from a local file or you can set this variable in your system.

Create a file named `migrate.js` inside of a folder named `database` with the following content:

```typescript
#!/usr/bin/env node
// @ts-check
const { default: Meyer } = require('meyer');
const { default: KnexDbms } = require('meyer-dbms-knex');
const path = require('path');
const parse = require('pg-connection-string').parse;

// optionally:
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

if (!process.env.DATABASE_URL) {
  console.error('No database URL provided from environment');
  process.exit(1);
}

async function run() {
  const options = parse(process.env.DATABASE_URL);

  /** @type import('knex').PgConnectionConfig */
  const options2 = {
    ...options,
    port: Number(options.port),
    ssl: Boolean(options.ssl),
  };
  const dbms = new KnexDbms('pg', options2);
  const meyer = new Meyer({
    tableName: '_migrations',
    migrationsPath: path.join(__dirname, '..', 'migrations'),
    development: process.env.MIGRATION_MODE === 'development',
    dbms,
  });

  await meyer.execute();
  await dbms.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Add the following to your `package.json` scripts section:

```json
"migrate": "node ./database/migrate.js"
```

Or if you're using dotenv:

```json
"migrate": "node -r dotenv/config ./database/migrate.js"
```

This code specifies the `migrationsPath` directory as `../migrations` which means we also need another folder inside the root of our project named `migrations`.

Create this migrations directory and add your first migration!

### Migration format:

Migrations happen in chronological order, so suggest the following naming pattern:

1. `001-myfirstmigration.sql`
2. `002-mysecondmigration.sql`
3. etc.

Each migration must contain an `up` and `down` section, here is an example migration which shows how to use them:

```sql
-- up:begin
create extension citext;
CREATE TABLE sessions (
  id SERIAL,
  user_id INTEGER NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  session_token text NOT NULL,
  access_token text NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE users (
  id SERIAL,
  name text,
  email citext,
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
-- up:end

-- down:begin
DROP TABLE users;
DROP TABLE sessions;
DROP EXTENSION citext;
-- down:end
```

Note that the `down` should happen in reverse order of the `up` in case there are dependencies on other items.

If you created the above script as mentioned, running `yarn migrate` here would put run this migration.

Alternatively, you could invoke the migrate function on application start by adapating that code into a module and calling the run function from wherever makes sense in your code.
