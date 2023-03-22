import type { GetColumnData } from '~/column';
import type { OptionalKeyOnly, RequiredKeyOnly } from '~/operations';
import { Table } from '~/table';
import type { Update } from '~/utils';
import type { Simplify } from '~/utils';
import type { CheckBuilder } from './checks';
import type { AnySQLiteColumn, AnySQLiteColumnBuilder, BuildColumns } from './columns/common';
import type { ForeignKey, ForeignKeyBuilder } from './foreign-keys';
import type { IndexBuilder } from './indexes';
import type { PrimaryKeyBuilder } from './primary-keys';

export type SQLiteTableExtraConfig = Record<
	string,
	| IndexBuilder
	| CheckBuilder
	| ForeignKeyBuilder
	| PrimaryKeyBuilder
>;
export interface TableConfig {
	name: string;
	columns: Record<string, AnySQLiteColumn>;
}

export type UpdateTableConfig<T extends TableConfig, TUpdate extends Partial<TableConfig>> = Update<T, TUpdate>;

/** @internal */
export const InlineForeignKeys = Symbol('InlineForeignKeys');

/** @internal */
export const ExtraConfigBuilder = Symbol('ExtraConfigBuilder');

export class SQLiteTable<T extends Partial<TableConfig>> extends Table<T['name']> {
	declare protected $columns: T['columns'];

	/** @internal */
	static override readonly Symbol = Object.assign(Table.Symbol, {
		InlineForeignKeys: InlineForeignKeys as typeof InlineForeignKeys,
		ExtraConfigBuilder: ExtraConfigBuilder as typeof ExtraConfigBuilder,
	});

	/** @internal */
	override [Table.Symbol.Columns]!: NonNullable<T['columns']>;

	/** @internal */
	[InlineForeignKeys]: ForeignKey[] = [];

	/** @internal */
	[ExtraConfigBuilder]: ((self: Record<string, AnySQLiteColumn>) => SQLiteTableExtraConfig) | undefined = undefined;

	override toString(): T['name'] {
		return this[Table.Symbol.Name]!;
	}
}

export type AnySQLiteTable<TPartial extends Partial<TableConfig> = {}> = SQLiteTable<Update<TableConfig, TPartial>>;

export type SQLiteTableWithColumns<T extends TableConfig> =
	& SQLiteTable<T>
	& {
		[Key in keyof T['columns']]: T['columns'][Key];
	};

/**
 * See `GetColumnConfig`.
 */
export type GetTableConfig<T extends AnySQLiteTable, TParam extends keyof TableConfig | undefined = undefined> =
	T extends SQLiteTableWithColumns<infer TConfig>
		? TParam extends undefined ? TConfig : TParam extends keyof TConfig ? TConfig[TParam] : TConfig
		: never;

export type InferModel<
	TTable extends AnySQLiteTable,
	TInferMode extends 'select' | 'insert' = 'select',
> = TInferMode extends 'insert' ? Simplify<
		& {
			[
				Key in keyof GetTableConfig<TTable, 'columns'> & string as RequiredKeyOnly<
					Key,
					GetTableConfig<TTable, 'columns'>[Key]
				>
			]: GetColumnData<GetTableConfig<TTable, 'columns'>[Key], 'query'>;
		}
		& {
			[
				Key in keyof GetTableConfig<TTable, 'columns'> & string as OptionalKeyOnly<
					Key,
					GetTableConfig<TTable, 'columns'>[Key]
				>
			]?: GetColumnData<GetTableConfig<TTable, 'columns'>[Key], 'query'>;
		}
	>
	: {
		[Key in keyof GetTableConfig<TTable, 'columns'>]: GetColumnData<
			GetTableConfig<TTable, 'columns'>[Key],
			'query'
		>;
	};

export interface SQLiteTableConfig<TName extends string> {
	name: TName;
	temporary?: boolean;
}

export function sqliteTable<TTableName extends string, TColumnsMap extends Record<string, AnySQLiteColumnBuilder>>(
	name: TTableName,
	columns: TColumnsMap,
	extraConfig?: (self: BuildColumns<TTableName, TColumnsMap>) => SQLiteTableExtraConfig,
): SQLiteTableWithColumns<{
	name: TTableName;
	columns: BuildColumns<TTableName, TColumnsMap>;
}> {
	const rawTable = new SQLiteTable<{
		name: TTableName;
		columns: BuildColumns<TTableName, TColumnsMap>;
	}>(name);

	const builtColumns = Object.fromEntries(
		Object.entries(columns).map(([name, colBuilder]) => {
			const column = colBuilder.build(rawTable);
			rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
			return [name, column];
		}),
	) as BuildColumns<TTableName, TColumnsMap>;

	const table = Object.assign(rawTable, builtColumns);

	table[Table.Symbol.Columns] = builtColumns;

	if (extraConfig) {
		table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig as (
			self: Record<string, AnySQLiteColumn>,
		) => SQLiteTableExtraConfig;
	}

	return table;
}

export function sqliteTableCreator(customizeTableName: (name: string) => string): typeof sqliteTable {
	const builder: typeof sqliteTable = (name, columns, extraConfig) => {
		return sqliteTable(customizeTableName(name) as typeof name, columns, extraConfig);
	};
	return builder;
}
