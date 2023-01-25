import { ColumnBaseConfig } from '~/column';
import { ColumnBuilderBaseConfig, ColumnBuilderConfig, UpdateCBConfig } from '~/column-builder';
import { SQL, sql } from '~/sql';
import { OnConflict } from '~/sqlite-core/utils';
import { AnySQLiteTable } from '../table';
import { SQLiteColumn, SQLiteColumnBuilder } from './common';

export interface PrimaryKeyConfig {
	autoIncrement?: boolean;
	onConflict?: OnConflict;
}

export abstract class SQLiteIntegerBaseBuilder<T extends ColumnBuilderBaseConfig = ColumnBuilderConfig>
	extends SQLiteColumnBuilder<Pick<T, keyof ColumnBuilderBaseConfig>, { autoIncrement: boolean }>
{
	constructor(name: string) {
		super(name);
		this.config.autoIncrement = false;
	}

	override notNull(): SQLiteIntegerBaseBuilder<UpdateCBConfig<T, { notNull: true }>> {
		return super.notNull() as ReturnType<this['notNull']>;
	}

	override default(value: T['data'] | SQL): SQLiteIntegerBaseBuilder<UpdateCBConfig<T, { hasDefault: true }>> {
		return super.default(value) as ReturnType<this['default']>;
	}

	override primaryKey(
		config?: PrimaryKeyConfig,
	): SQLiteIntegerBaseBuilder<UpdateCBConfig<T, { notNull: true; hasDefault: true }>> {
		if (config?.autoIncrement) {
			this.config.autoIncrement = true;
		}
		this.config.hasDefault = true;
		return super.primaryKey() as ReturnType<this['primaryKey']>;
	}

	/** @internal */
	abstract override build<TTableName extends string>(
		table: AnySQLiteTable<{ name: TTableName }>,
	): SQLiteBaseInteger<Pick<T, keyof ColumnBuilderBaseConfig> & { tableName: TTableName }>;
}

export abstract class SQLiteBaseInteger<T extends ColumnBaseConfig>
	extends SQLiteColumn<Pick<T, keyof ColumnBaseConfig>>
{
	protected override $sqliteColumnBrand!: 'SQLiteInteger';

	readonly autoIncrement: boolean;

	constructor(
		override readonly table: AnySQLiteTable<{ name: T['tableName'] }>,
		config: SQLiteIntegerBaseBuilder<Omit<T, 'tableName'>>['config'],
	) {
		super(table, config);
		this.autoIncrement = config.autoIncrement;
	}

	getSQLType(): string {
		return 'integer';
	}
}

interface SQLiteIntegerConfig {
	data: number;
	driverParam: number;
}

export class SQLiteIntegerBuilder<
	T extends Pick<ColumnBuilderBaseConfig, 'notNull' | 'hasDefault'> = { notNull: false; hasDefault: false },
> extends SQLiteIntegerBaseBuilder<SQLiteIntegerConfig & Pick<T, 'notNull' | 'hasDefault'>> {
	build<TTableName extends string>(table: AnySQLiteTable<{ name: TTableName }>): SQLiteInteger<
		Pick<T, 'notNull' | 'hasDefault'> & { tableName: TTableName }
	> {
		return new SQLiteInteger<Pick<T, 'notNull' | 'hasDefault'> & { tableName: TTableName }>(table, this.config);
	}
}

export class SQLiteInteger<T extends Pick<ColumnBaseConfig, 'tableName' | 'notNull' | 'hasDefault'>>
	extends SQLiteBaseInteger<SQLiteIntegerConfig & Pick<T, 'tableName' | 'notNull' | 'hasDefault'>>
{}

interface SQLiteTimestampConfig {
	data: Date;
	driverParam: number;
}

export class SQLiteTimestampBuilder<
	T extends Pick<ColumnBuilderBaseConfig, 'notNull' | 'hasDefault'> = { notNull: false; hasDefault: false },
> extends SQLiteIntegerBaseBuilder<SQLiteTimestampConfig & Pick<T, 'notNull' | 'hasDefault'>> {
	override notNull(): SQLiteTimestampBuilder<UpdateCBConfig<T, { notNull: true }>> {
		return super.notNull() as ReturnType<this['notNull']>;
	}

	override default(value: Date | SQL): SQLiteTimestampBuilder<UpdateCBConfig<T, { hasDefault: true }>> {
		return super.default(value) as ReturnType<this['default']>;
	}

	override primaryKey(config?: PrimaryKeyConfig): SQLiteTimestampBuilder<{ notNull: true; hasDefault: true }> {
		return super.primaryKey(config) as ReturnType<this['primaryKey']>;
	}

	/**
	 * Adds `DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))` to the column, which is the current epoch timestamp in milliseconds.
	 */
	defaultNow(): SQLiteTimestampBuilder<UpdateCBConfig<T, { hasDefault: true }>> {
		return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
	}

	build<TTableName extends string>(table: AnySQLiteTable<{ name: TTableName }>): SQLiteTimestamp<
		Pick<T, 'notNull' | 'hasDefault'> & { tableName: TTableName }
	> {
		return new SQLiteTimestamp<Pick<T, 'notNull' | 'hasDefault'> & { tableName: TTableName }>(table, this.config);
	}
}

export class SQLiteTimestamp<T extends Pick<ColumnBaseConfig, 'tableName' | 'notNull' | 'hasDefault'>>
	extends SQLiteBaseInteger<SQLiteTimestampConfig & Pick<T, 'tableName' | 'notNull' | 'hasDefault'>>
{
	override mapFromDriverValue(value: number): Date {
		return new Date(value);
	}

	override mapToDriverValue(value: Date): number {
		return value.getTime();
	}
}

export interface IntegerConfig<TMode extends 'number' | 'timestamp' = 'number' | 'timestamp'> {
	mode: TMode;
}

export function integer(name: string, config?: IntegerConfig<'number'>): SQLiteIntegerBuilder;
export function integer(name: string, config?: IntegerConfig<'timestamp'>): SQLiteTimestampBuilder;
export function integer(name: string, config?: IntegerConfig): SQLiteIntegerBaseBuilder<any> {
	if (config?.mode === 'timestamp') {
		return new SQLiteTimestampBuilder(name);
	}
	return new SQLiteIntegerBuilder(name);
}

export const int = integer;
