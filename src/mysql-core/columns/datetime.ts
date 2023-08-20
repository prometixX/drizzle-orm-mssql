import type { ColumnBaseConfig } from '~/column';
import type { ColumnBuilderBaseConfig, ColumnBuilderRuntimeConfig, MakeColumnConfig } from '~/column-builder';
import { entityKind } from '~/entity';
import type { AnyMySqlTable } from '~/mysql-core/table';
import { type Equal } from '~/utils';
import { MySqlColumn, MySqlColumnBuilder } from './common';

export type MySqlDateTimeBuilderInitial<TName extends string> = MySqlDateTimeBuilder<{
	name: TName;
	dataType: 'date';
	columnType: 'MySqlDateTime';
	data: Date;
	driverParam: string | number;
	enumValues: undefined;
}>;

export class MySqlDateTimeBuilder<T extends ColumnBuilderBaseConfig<'date', 'MySqlDateTime'>>
	extends MySqlColumnBuilder<T, MySqlDatetimeConfig<'date'>> {
	static readonly [entityKind]: string = 'MySqlDateTimeBuilder';

	constructor(name: T['name'], config: MySqlDatetimeConfig<'date'>) {
		super(name, 'date', 'MySqlDateTime');
		this.config.fsp = config?.fsp;
    this.config.utc = config?.utc;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyMySqlTable<{ name: TTableName }>,
	): MySqlDateTime<MakeColumnConfig<T, TTableName>> {
		return new MySqlDateTime<MakeColumnConfig<T, TTableName>>(
			table,
			this.config as ColumnBuilderRuntimeConfig<any, any>,
		);
	}
}

export class MySqlDateTime<T extends ColumnBaseConfig<'date', 'MySqlDateTime'>> extends MySqlColumn<T, MySqlDatetimeConfig> {
	static readonly [entityKind]: string = 'MySqlDateTime';

	readonly fsp: number | undefined;
  readonly utc: boolean | undefined;

	constructor(
		table: AnyMySqlTable<{ name: T['tableName'] }>,
		config: MySqlDateTimeBuilder<T>['config'],
	) {
		super(table, config);
		this.fsp = config.fsp;
    this.utc = config.utc;
	}

	getSQLType(): string {
		const precision = this.fsp === undefined ? '' : `(${this.fsp})`;
		return `datetime${precision}`;
	}

  override mapToDriverValue(value1: Date): unknown {
    return this.utc
      ? value1.toISOString().replace('T', ' ').replace('Z', '')
      : value1;
  }

	override mapFromDriverValue(value: string): Date {
		return new Date(this.utc ? value.replace(' ', 'T') + 'Z' : value);
	}
}

export type MySqlDateTimeStringBuilderInitial<TName extends string> = MySqlDateTimeStringBuilder<{
	name: TName;
	dataType: 'string';
	columnType: 'MySqlDateTimeString';
	data: string;
	driverParam: string | number;

	enumValues: undefined;
}>;

export class MySqlDateTimeStringBuilder<T extends ColumnBuilderBaseConfig<'string', 'MySqlDateTimeString'>>
	extends MySqlColumnBuilder<T, MySqlDatetimeConfig>
{
	static readonly [entityKind]: string = 'MySqlDateTimeStringBuilder';

	constructor(name: T['name'], config: MySqlDatetimeConfig | undefined) {
		super(name, 'string', 'MySqlDateTimeString');
		this.config.fsp = config?.fsp;
	}

	/** @internal */
	override build<TTableName extends string>(
		table: AnyMySqlTable<{ name: TTableName }>,
	): MySqlDateTimeString<MakeColumnConfig<T, TTableName>> {
		return new MySqlDateTimeString<MakeColumnConfig<T, TTableName>>(
			table,
			this.config as ColumnBuilderRuntimeConfig<any, any>,
		);
	}
}

export class MySqlDateTimeString<T extends ColumnBaseConfig<'string', 'MySqlDateTimeString'>> extends MySqlColumn<T, MySqlDatetimeConfig> {
	static readonly [entityKind]: string = 'MySqlDateTimeString';

	readonly fsp: number | undefined;

	constructor(
		table: AnyMySqlTable<{ name: T['tableName'] }>,
		config: MySqlDateTimeStringBuilder<T>['config'],
	) {
		super(table, config);
		this.fsp = config.fsp;
	}

	getSQLType(): string {
		const precision = this.fsp === undefined ? '' : `(${this.fsp})`;
		return `datetime${precision}`;
	}
}

export type DatetimeFsp = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// If user specifies mode: 'date'. the utc option will be required
export type MySqlDatetimeConfig<TMode extends "date" | "string" = "date" | "string">
  = Equal<TMode, 'string'> extends true
    ? {
        mode?: TMode;
        fsp?: DatetimeFsp;
      }
    : {
        mode?: TMode;
        fsp?: DatetimeFsp;
        utc?: boolean;
      };

export function datetime<TName extends string, TMode extends MySqlDatetimeConfig['mode'] & {}>(
	name: TName,
	config?: MySqlDatetimeConfig<TMode>,
): Equal<TMode, 'string'> extends true ? MySqlDateTimeStringBuilderInitial<TName> : MySqlDateTimeBuilderInitial<TName>;
export function datetime(name: string, config: MySqlDatetimeConfig = {}) {
	if (config.mode === 'string') {
		return new MySqlDateTimeStringBuilder(name, config);
	}
	return new MySqlDateTimeBuilder(name, config as MySqlDatetimeConfig<'date'>);
}
