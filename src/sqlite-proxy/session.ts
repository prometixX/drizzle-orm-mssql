import type { Logger } from '~/logger';
import { NoopLogger } from '~/logger';
import { fillPlaceholders, type Query, sql } from '~/sql';
import { SQLiteTransaction } from '~/sqlite-core';
import type { SQLiteAsyncDialect } from '~/sqlite-core/dialect';
import type { SelectedFieldsOrdered } from '~/sqlite-core/query-builders/select.types';
import type { PreparedQueryConfig as PreparedQueryConfigBase, SQLiteTransactionConfig } from '~/sqlite-core/session';
import { PreparedQuery as PreparedQueryBase, SQLiteSession } from '~/sqlite-core/session';
import { mapResultRow } from '~/utils';
import { type RemoteCallback, type SqliteRemoteResult } from './driver';

export interface SQLiteRemoteSessionOptions {
	logger?: Logger;
}

type PreparedQueryConfig = Omit<PreparedQueryConfigBase, 'statement' | 'run'>;

export class SQLiteRemoteSession extends SQLiteSession<'async', SqliteRemoteResult> {
	private logger: Logger;

	constructor(
		private client: RemoteCallback,
		dialect: SQLiteAsyncDialect,
		options: SQLiteRemoteSessionOptions = {},
	) {
		super(dialect);
		this.logger = options.logger ?? new NoopLogger();
	}

	prepareQuery<T extends Omit<PreparedQueryConfig, 'run'>>(
		query: Query,
		fields?: SelectedFieldsOrdered,
	): PreparedQuery<T> {
		return new PreparedQuery(this.client, query.sql, query.params, this.logger, fields);
	}

	override async transaction<T>(
		transaction: (tx: SQLiteProxyTransaction) => Promise<T>,
		config?: SQLiteTransactionConfig,
	): Promise<T> {
		const tx = new SQLiteProxyTransaction(this.dialect, this);
		await this.run(sql.raw(`begin${config?.behavior ? ' ' + config.behavior : ''}`));
		try {
			const result = await transaction(tx);
			await this.run(sql`commit`);
			return result;
		} catch (err) {
			await this.run(sql`rollback`);
			throw err;
		}
	}
}

export class SQLiteProxyTransaction extends SQLiteTransaction<'async', SqliteRemoteResult> {
	override async transaction<T>(transaction: (tx: SQLiteProxyTransaction) => Promise<T>): Promise<T> {
		const savepointName = `sp${this.nestedIndex}`;
		const tx = new SQLiteProxyTransaction(this.dialect, this.session, this.nestedIndex + 1);
		await this.session.run(sql.raw(`savepoint ${savepointName}`));
		try {
			const result = await transaction(tx);
			await this.session.run(sql.raw(`release savepoint ${savepointName}`));
			return result;
		} catch (err) {
			await this.session.run(sql.raw(`rollback to savepoint ${savepointName}`));
			throw err;
		}
	}
}

export class PreparedQuery<T extends PreparedQueryConfig = PreparedQueryConfig> extends PreparedQueryBase<
	{ type: 'async'; run: SqliteRemoteResult; all: T['all']; get: T['get']; values: T['values'] }
> {
	constructor(
		private client: RemoteCallback,
		private queryString: string,
		private params: unknown[],
		private logger: Logger,
		private fields: SelectedFieldsOrdered | undefined,
	) {
		super();
	}

	async run(placeholderValues?: Record<string, unknown>): Promise<SqliteRemoteResult> {
		const params = fillPlaceholders(this.params, placeholderValues ?? {});
		this.logger.logQuery(this.queryString, params);
		return await this.client(this.queryString, params, 'run');
	}

	async all(placeholderValues?: Record<string, unknown>): Promise<T['all']> {
		const { fields } = this;

		const params = fillPlaceholders(this.params, placeholderValues ?? {});
		this.logger.logQuery(this.queryString, params);

		const clientResult = this.client(this.queryString, params, 'all');

		if (fields) {
			return clientResult.then((values) =>
				values.rows.map((row) => mapResultRow(fields, row, this.joinsNotNullableMap))
			);
		}

		return this.client(this.queryString, params, 'all').then(({ rows }) => rows!);
	}

	async get(placeholderValues?: Record<string, unknown>): Promise<T['get']> {
		const { fields } = this;

		const params = fillPlaceholders(this.params, placeholderValues ?? {});
		this.logger.logQuery(this.queryString, params);

		const clientResult = await this.client(this.queryString, params, 'get');

		if (fields) {
			if (typeof clientResult.rows === 'undefined') {
				return mapResultRow(fields, [], this.joinsNotNullableMap);
			}
			return mapResultRow(fields, clientResult.rows, this.joinsNotNullableMap);
		}

		return clientResult.rows;
	}

	async values<T extends any[] = unknown[]>(placeholderValues?: Record<string, unknown>): Promise<T[]> {
		const params = fillPlaceholders(this.params, placeholderValues ?? {});
		this.logger.logQuery(this.queryString, params);
		const clientResult = await this.client(this.queryString, params, 'values');
		return clientResult.rows as T[];
	}
}
