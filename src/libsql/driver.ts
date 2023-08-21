import type { Client, ResultSet } from '@libsql/client';
import { entityKind } from '~/entity';
import { DefaultLogger } from '~/logger';
import { type SelectResult } from '~/query-builders/select.types';
import {
	createTableRelationsHelpers,
	extractTablesRelationalConfig,
	type RelationalSchemaConfig,
	type TablesRelationalConfig,
} from '~/relations';
import {
	type SQLiteDelete,
	type SQLiteInsert,
	type SQLiteSelect,
	type SQLiteUpdate,
} from '~/sqlite-core';
import { BaseSQLiteDatabase } from '~/sqlite-core/db';
import { SQLiteAsyncDialect } from '~/sqlite-core/dialect';
import { type SQLiteRelationalQuery } from '~/sqlite-core/query-builders/query';
import { type SQLiteRaw } from '~/sqlite-core/query-builders/raw';
import { type DrizzleConfig } from '~/utils';
import { LibSQLSession } from './session';

export type BatchParameters =
	| SQLiteUpdate<any, 'async', ResultSet, any>
	| SQLiteSelect<any, 'async', ResultSet, any>
	| SQLiteDelete<any, 'async', ResultSet, any>
	| SQLiteInsert<any, 'async', ResultSet, any>
	| SQLiteRelationalQuery<'async', any>
	| SQLiteRaw<any>;

export type BatchResponse<U extends BatchParameters, TQuery extends Readonly<[U, ...U[]]>> = {
	[K in keyof TQuery]: TQuery[K] extends
		SQLiteSelect<infer _TTable, 'async', infer _TRes, infer TSelection, infer TSelectMode, infer TNullabilityMap>
		? SelectResult<TSelection, TSelectMode, TNullabilityMap>[]
		: TQuery[K] extends SQLiteUpdate<infer _TTable, 'async', infer _TRunResult, infer _TReturning>
			? _TReturning extends undefined ? _TRunResult : _TReturning[]
		: TQuery[K] extends SQLiteInsert<infer _TTable, 'async', infer _TRunResult, infer _TReturning>
			? _TReturning extends undefined ? _TRunResult : _TReturning[]
		: TQuery[K] extends SQLiteDelete<infer _TTable, 'async', infer _TRunResult, infer _TReturning>
			? _TReturning extends undefined ? _TRunResult : _TReturning[]
		: TQuery[K] extends SQLiteRelationalQuery<'async', infer TResult> ? TResult
		: TQuery[K] extends SQLiteRaw<infer TResult> ? TResult
		: never;
};

export type BatchResponse1<TQuery extends BatchParameters[]> = {
	[K in keyof TQuery]: TQuery[K]
}

export class LibSQLDatabase<
	TSchema extends Record<string, unknown> = Record<string, never>,
> extends BaseSQLiteDatabase<'async', ResultSet, TSchema> {
	static readonly [entityKind]: string = 'LibSQLDatabase';

	async batch<U extends BatchParameters, T extends Readonly<[U, ...U[]]>>(
		batch: T,
	): Promise<BatchResponse<U, T>> {
		return await (this.session as LibSQLSession<TSchema, any>).batch(batch.map((it) => it.getSQL())) as BatchResponse<U, T>;
	}
}

export function drizzle<
	TSchema extends Record<string, unknown> = Record<string, never>,
>(client: Client, config: DrizzleConfig<TSchema> = {}): LibSQLDatabase<TSchema> {
	const dialect = new SQLiteAsyncDialect();
	let logger;
	if (config.logger === true) {
		logger = new DefaultLogger();
	} else if (config.logger !== false) {
		logger = config.logger;
	}

	let schema: RelationalSchemaConfig<TablesRelationalConfig> | undefined;
	if (config.schema) {
		const tablesConfig = extractTablesRelationalConfig(
			config.schema,
			createTableRelationsHelpers,
		);
		schema = {
			fullSchema: config.schema,
			schema: tablesConfig.tables,
			tableNamesMap: tablesConfig.tableNamesMap,
		};
	}

	const session = new LibSQLSession(client, dialect, schema, { logger }, undefined);
	return new BaseSQLiteDatabase('async', dialect, session, schema) as LibSQLDatabase<TSchema>;
}
