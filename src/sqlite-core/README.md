<div align='center'>
<h1>Drizzle ORM | SQLite <a href=''><img alt='npm' src='https://img.shields.io/npm/v/drizzle-orm?label='></a></h1>
<img alt='npm' src='https://img.shields.io/npm/dm/drizzle-orm'>
<img alt='npm bundle size' src='https://img.shields.io/bundlephobia/min/drizzle-orm'>
<a href='https://discord.gg/yfjTbVXMW4'><img alt='Discord' src='https://img.shields.io/discord/1043890932593987624'></a>
<img alt='License' src='https://img.shields.io/npm/l/drizzle-orm'>
<h6><i>If you know SQL, you know Drizzle ORM</i></h6>
<hr />
</div>

DrizzleORM is a [tiny](https://twitter.com/_alexblokh/status/1594735880417472512), [blazingly fast](#️-performance-and-prepared-statements) TypeScript ORM library with a [drizzle-kit](#-migrations) CLI companion for automatic SQL migrations generation.
Here you can find extensive docs for SQLite module.

| Driver | Support | | Driver version |
|:- | :-: | :-: | :-: |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | ✅ | | <img alt='driver version' src='https://img.shields.io/npm/dependency-version/drizzle-orm/peer/better-sqlite3'> |
| [sql.js](https://github.com/sql-js/sql.js/) | ✅ | | <img alt='driver version' src='https://img.shields.io/npm/dependency-version/drizzle-orm/peer/sql.js'> |
| [node-sqlite3](https://github.com/TryGhost/node-sqlite3) | ⏳ | | |
| [bun:sqlite](https://github.com/oven-sh/bun#bunsqlite-sqlite3-module) | ✅ | [Example](https://github.com/drizzle-team/drizzle-orm/tree/main/examples/bun-sqlite)| |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | ✅ | [Example](https://github.com/drizzle-team/drizzle-orm/tree/main/examples/cloudflare-d1)| |
| [Fly.io LiteFS](https://fly.io/docs/litefs/getting-started/) | ✅ | | |
| [Custom proxy driver](https://github.com/drizzle-team/drizzle-orm/tree/main/examples/sqlite-proxy) | ✅ | | |

## 💾 Installation

```bash
npm install drizzle-orm better-sqlite3
## opt-in automatic migrations generator
npm install -D drizzle-kit 
```

## 🚀 Quick start

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  fullName: text('full_name'),
})

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

const users = db.select().from(users).all();
```

## Connecting to databases

```typescript
// better-sqlite3 or fly.io LiteFS
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(sqlite);
const result = db.select().from(users).all()

// bun js embedded sqlite connector
import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const sqlite = new Database('nw.sqlite');
const db: BunSQLiteDatabase = drizzle(sqlite);
const result = db.select().from(users).all()

// Cloudflare D1 connector
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

// env.DB from cloudflare worker environment
const db: DrizzleD1Database = drizzle(env.DB);
const result = await db.select().from(users).all(); // pay attention this one is async

// Custom Proxy HTTP driver
  const db = drizzle(async (sql, params, method) => {
    try {
      const rows = await axios.post('http://localhost:3000/query', { sql, params, method });

      return { rows: rows.data };
    } catch (e: any) {
      console.error('Error from sqlite proxy server: ', e.response.data)
      return { rows: [] };
    }
  });
// More example for proxy: https://github.com/drizzle-team/drizzle-orm/tree/main/examples/sqlite-proxy
```

## SQL schema declaration

With `drizzle-orm` you declare SQL schema in TypeScript. You can have either one `schema.ts` file with all declarations or you can group them logically in multiple files. We prefer to use single file schema.

### Single schema file example

```plaintext
📦 <project root>
 └ 📂 src
    └ 📂 db
       └ 📜schema.ts
```

### Multiple schema files example

```plaintext
📦 <project root>
 └ 📂 src
    └ 📂 db
       └ 📂 schema
          ├ 📜users.ts
          ├ 📜countries.ts
          ├ 📜cities.ts
          ├ 📜products.ts
          ├ 📜clients.ts
          ├ 📜enums.ts
          └ 📜etc.ts
```

This is how you declare SQL schema in `schema.ts`. You can declare tables, indexes and constraints, foreign keys and enums. Please pay attention to `export` keyword, they are mandatory if you'll be using [drizzle-kit SQL migrations generator](#-migrations).

```typescript
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const countries = sqliteTable('countries', {
    id: integer('id').primaryKey(),
    name: text('name'),
  }, (countries) => ({
    nameIdx: uniqueIndex('nameIdx').on(countries.name),
  })
);

export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey(),
  name: text('name'),
  countryId: integer('country_id').references(() => countries.id),
})
```

Database and table entity types

```typescript
import { InferModel, text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  fullName: text('full_name'),
  phone: text('phone'),
})

export type User = InferModel<typeof users> // return type when queried
export type InsertUser = InferModel<typeof users, 'insert'> // insert type
...
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(sqlite);

const result: User[] = db.select().from(users).all();

const insertUser = (user: InsertUser) => {
  return db.insert(users).values(user).run()
}
```

The list of all column types. You can also create custom types - [see here](https://github.com/drizzle-team/drizzle-orm/blob/main/docs/custom-types.md).

```typescript
integer('...')
integer('...', { mode: 'number' | 'timestamp' | 'bigint' })
real('...')
text('...');
text<'union' | 'string' | 'type'>('...');

blob('...');
blob('...', { mode: 'json' | 'buffer' });
blob<{ foo: string }>('...');

column.primaryKey()
column.notNull()
column.default(...)
```

Declaring indexes, foreign keys and composite primary keys

```typescript
import { sqliteTable, foreignKey, primaryKey, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const countries = sqliteTable('countries', {
    id: integer('id').primaryKey(),
    name: text('name', { length: 256 }),
    population: integer('population'),
  }, (countries) => ({
    nameIdx: index('name_idx').on(countries.name), // one column
    namePopulationIdx: index('name_population_idx').on(countries.name, countries.population), // multiple columns
    uniqueIdx: uniqueIndex('unique_idx').on(countries.name), // unique index
  })
);

export const cities = sqliteTable('cities', {
  id: integer('id').primaryKey(),
  name: text('name', { length: 256 }),
  countryId: integer('country_id').references(() => countries.id), // inline foreign key
  countryName: text('country_id'),
}, (cities) => ({
  // explicit foreign key with 1 column
  countryFk: foreignKey(() => ({
    columns: [cities.countryId],
    foreignColumns: [countries.id],
  })),
  // explicit foreign key with multiple columns
  countryIdNameFk: foreignKey(() => ({
    columns: [cities.countryId, cities.countryName],
    foreignColumns: [countries.id, countries.name],
  })),
}));

const pkExample = sqliteTable('pk_example', {
  id: integer('id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
}, (pkExample) => ({
  // composite primary key on multiple columns
  compositePk: primaryKey(pkExample.id, pkExample.name)
}));

// you can have .where() on indexes
index('name_idx').on(table.column).where(sql``)
```

### Create Read Update Delete

Querying, sorting and filtering. We also support partial select.

```typescript
...
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { and, asc, desc, eq, or } from 'drizzle-orm/expressions'
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('full_name'),
});

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

db.select().from(users).all();
db.select().from(users).where(eq(users.id, 42)).get();

// you can combine filters with and(...) or or(...)
db.select().from(users).where(and(eq(users.id, 42), eq(users.name, 'Dan'))).all();

db.select().from(users).where(or(eq(users.id, 42), eq(users.id, 1))).all();

// partial select
const result = db
  .select({
    field1: users.id,
    field2: users.name,
  })
  .from(users)
  .all();
const { field1, field2 } = result[0];

// limit offset & order by
db.select().from(users).limit(10).offset(10).all();
db.select().from(users).orderBy(users.name).all();
db.select().from(users).orderBy(desc(users.name)).all();
// you can pass multiple order args
db.select().from(users).orderBy(asc(users.name), desc(users.name)).all();

// list of all filter operators
eq(column, value)
eq(column1, column2)
ne(column, value)
ne(column1, column2)

notEq(column, value)
less(column, value)
lessEq(column, value)

gt(column, value)
gt(column1, column2)
gte(column, value)
gte(column1, column2)
lt(column, value)
lt(column1, column2)
lte(column, value)
lte(column1, column2)

isNull(column)
isNotNull(column)

inArray(column, values[])
inArray(column, sqlSubquery)
notInArray(column, values[])
notInArray(column, sqlSubquery)

exists(sqlSubquery)
notExists(sqlSubquery)

between(column, min, max)
notBetween(column, min, max)

like(column, value)
like(column, value)
ilike(column, value)
notIlike(column, value)

not(sqlExpression)

and(expressions: Expr[])
or(expressions: Expr[])
```

Inserting

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

db.insert(users).values({ name: 'Andrew', createdAt: +new Date() }).run();

// insert multiple users
db.insert(users).values({
      name: 'Andrew',
      createdAt: +new Date(),
    },{
      name: 'Dan',
      createdAt: +new Date(),
    }).run();

// insert with returning
const insertedUser = db.insert(users).values({ name: 'Dan', createdAt: +new Date() }).returning().get()
```

Update and Delete

```typescript
db.update(users)
  .set({ name: 'Mr. Dan' })
  .where(eq(usersTable.name, 'Dan'))
  .run();
  
db.delete(users)
  .where(eq(usersTable.name, 'Dan'))
  .run();
```

### Aggregations

They work just like they do in SQL, but you have them fully type safe

```typescript
const orders = sqliteTable('order', {
  id: integer('id').primaryKey(),
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
  requiredDate: integer('required_date', { mode: 'timestamp' }).notNull(),
  shippedDate: integer('shipped_date', { mode: 'timestamp' }),
  shipVia: integer('ship_via').notNull(),
  freight: numeric('freight').notNull(),
  shipName: text('ship_name').notNull(),
  shipCity: text('ship_city').notNull(),
  shipRegion: text('ship_region'),
  shipPostalCode: text('ship_postal_code'),
  shipCountry: text('ship_country').notNull(),
  customerId: text('customer_id').notNull(),
  employeeId: integer('employee_id').notNull(),
});

const details = sqliteTable('order_detail', {
  unitPrice: numeric('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  discount: numeric('discount').notNull(),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id').notNull(),
});


db
  .select({
    id: orders.id,
    shippedDate: orders.shippedDate,
    shipName: orders.shipName,
    shipCity: orders.shipCity,
    shipCountry: orders.shipCountry,
    productsCount: sql`count(${details.productId})`.as<number>(),
    quantitySum: sql`sum(${details.quantity})`.as<number>(),
    totalPrice: sql`sum(${details.quantity} * ${details.unitPrice})`.as<number>(),
  })
  .from(orders)
  .leftJoin(details, eq(orders.id, details.orderId))
  .groupBy(orders.id)
  .orderBy(asc(orders.id))
  .all();
```

### Joins

Last but not least. Probably the most powerful feature in the library🚀

> **Note**: for in-depth partial select joins documentation, refer to [this page](/docs/joins.md).

### Many-to-one

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const cities = sqliteTable('cities', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  cityId: integer('city_id').references(() => cities.id)
});

const db = drizzle(sqlite);

const result = db.select().from(cities).leftJoin(users, eq(cities2.id, users2.cityId)).all();
```

### Many-to-many

```typescript
const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const chatGroups = sqliteTable('chat_groups', {
  id: integer('id').primaryKey(),
  name: text('name'),
});

const usersToChatGroups = sqliteTable('usersToChatGroups', {
  userId: integer('user_id').notNull().references(() => users.id),
  groupId: integer('group_id').notNull().references(() => chatGroups.id),
});

...
const db = drizzle(...);

// querying user group with id 1 and all the participants(users)
db
  .select()
  .from(usersToChatGroups)
  .leftJoin(users, eq(usersToChatGroups.userId, users.id))
  .leftJoin(chatGroups, eq(usersToChatGroups.groupId, chatGroups.id))
  .where(eq(chatGroups.id, 1))
  .all();
```

### Join aliases and self-joins

```typescript
import { ..., alias } from 'drizzle-orm/sqlite-core';

export const files = sqliteTable('folders', {
  name: text('name').notNull(),
  parent: text('parent_folder')
})

...
const db = drizzle(...);

const nestedFiles = alias(files, 'nested_files');
db.select().from(files)
  .leftJoin(nestedFiles, eq(files.name, nestedFiles.name))
  .where(eq(files.parent, '/'))
  .all();
// will return files and folders and nested files for each folder at root dir
```

### Join using partial field select

Join Cities with Users getting only needed fields form request

```typescript
db
  .select({
    id: cities.id,
    cityName: cities.name
    userId: users.id
  })
  .from(cities)
  .leftJoin(users, eq(users.cityId, cities.id))
  .all();
```

## ⚡️ Performance and prepared statements

With Drizzle ORM you can go [**faster than better-sqlite3 driver**](https://twitter.com/_alexblokh/status/1593593415907909634) by utilizing our `prepared statements` and `placeholder` APIs

```typescript
import { placeholder } from 'drizzle-orm/sql';

const db = drizzle(...);

const q = db.select().from(customers).prepare();
q.all() // SELECT * FROM customers

const q = db.select().from(customers).where(eq(customers.id, placeholder('id'))).prepare()

q.get({ id: 10 }) // SELECT * FROM customers WHERE id = 10
q.get({ id: 12 }) // SELECT * FROM customers WHERE id = 12

const q = db
  .select()
  .from(customers)
  .where(sql`lower(${customers.name}) like ${placeholder('name')}`)
  .prepare();

q.all({ name: '%an%' }) // SELECT * FROM customers WHERE name ilike '%an%'
```

## 🗄 Migrations

### Automatic SQL migrations generation with drizzle-kit

[DrizzleKit](https://www.npmjs.com/package/drizzle-kit) - is a CLI migrator tool for DrizzleORM. It is probably one and only tool that lets you completely automatically generate SQL migrations and covers ~95% of the common cases like deletions and renames by prompting user input.
Check out the [docs for DrizzleKit](https://github.com/drizzle-team/drizzle-kit-mirror)

For schema file:

```typescript
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name'),
}, (users) => ({
  nameIdx: index('name_idx', users.fullName),
}));

export const authOtps = sqliteTable('auth_otp', {
  id: integer('id').primaryKey(),
  phone: text('phone'),
  userId: integer('user_id').references(() => users.id),
});
```

It will generate:

```SQL
CREATE TABLE IF NOT EXISTS auth_otp (
  'id' INTEGER PRIMARY KEY,
  'phone' TEXT,
  'user_id' INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  'id' INTEGER PRIMARY KEY,
  'full_name' TEXT
);

DO $$ BEGIN
 ALTER TABLE auth_otp ADD CONSTRAINT auth_otp_user_id_fkey FOREIGN KEY ('user_id') REFERENCES users(id);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS users_full_name_index ON users (full_name);
```

And you can run migrations manually or using our embedded migrations module

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

// this will automatically run needed migrations on the database
migrate(db, { migrationsFolder: './drizzle' });
```

## Utility stuff

### Printing SQL query

```typescript
const query = db
  .select({ id: users.id, name: users.name })
  .from(users)
  .groupBy(users.id)
  .toSQL();
// query:
{
  sql: 'select 'id', 'name' from 'users' group by 'users'.'id'',
  params: [],
}
```

### Raw query usage

```typescript
// it will automatically run a parametrized query!
const res: QueryResult<any> = db.run(sql`SELECT * FROM users WHERE user.id = ${userId}`);
```
