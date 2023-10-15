import type { Placeholder, SQL } from '~/sql/index.ts';
import type { Assume, ValidateShape } from '~/utils.ts';

import type { SQLiteColumn } from '~/sqlite-core/columns/index.ts';
import type { SQLiteTable, SQLiteTableWithColumns } from '~/sqlite-core/table.ts';

import type {
	SelectedFields as SelectFieldsBase,
	SelectedFieldsFlat as SelectFieldsFlatBase,
	SelectedFieldsOrdered as SelectFieldsOrderedBase,
} from '~/operations.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type {
	AppendToNullabilityMap,
	AppendToResult,
	BuildSubquerySelection,
	GetSelectTableName,
	JoinNullability,
	JoinType,
	MapColumnsToTableAlias,
	SelectMode,
	SelectResult,
	SetOperator,
} from '~/query-builders/select.types.ts';
import type { Subquery } from '~/subquery.ts';
import type { Table, UpdateTableConfig } from '~/table.ts';
import type { ColumnsSelection, View } from '~/view.ts';
import type { SQLitePreparedQuery } from '../session.ts';
import type { SQLiteViewBase, SQLiteViewWithSelection } from '../view.ts';
import type { SQLiteSelectBase, SQLiteSelectQueryBuilderBase } from './select.ts';
import type { SQLiteSetOperatorBase, SQLiteSetOperatorBuilder } from './set-operators.ts';

export interface SQLiteSelectJoinConfig {
	on: SQL | undefined;
	table: SQLiteTable | Subquery | SQLiteViewBase | SQL;
	alias: string | undefined;
	joinType: JoinType;
}

export type BuildAliasTable<TTable extends SQLiteTable | View, TAlias extends string> = TTable extends Table
	? SQLiteTableWithColumns<
		UpdateTableConfig<TTable['_']['config'], {
			name: TAlias;
			columns: MapColumnsToTableAlias<TTable['_']['columns'], TAlias, 'sqlite'>;
		}>
	>
	: TTable extends View ? SQLiteViewWithSelection<
			TAlias,
			TTable['_']['existing'],
			MapColumnsToTableAlias<TTable['_']['selectedFields'], TAlias, 'sqlite'>
		>
	: never;

export interface SQLiteSelectConfig {
	withList?: Subquery[];
	fields: Record<string, unknown>;
	fieldsFlat?: SelectedFieldsOrdered;
	where?: SQL;
	having?: SQL;
	table: SQLiteTable | Subquery | SQLiteViewBase | SQL;
	limit?: number | Placeholder;
	offset?: number | Placeholder;
	joins?: SQLiteSelectJoinConfig[];
	orderBy?: (SQLiteColumn | SQL | SQL.Aliased)[];
	groupBy?: (SQLiteColumn | SQL | SQL.Aliased)[];
	distinct?: boolean;
}

export type SQLiteJoin<
	T extends AnySQLiteSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
	TJoinedTable extends SQLiteTable | Subquery | SQLiteViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
> = T extends any ? SQLiteSelectWithout<
		SQLiteSelectKind<
			T['_']['hkt'],
			T['_']['tableName'],
			T['_']['resultType'],
			T['_']['runResult'],
			AppendToResult<
				T['_']['tableName'],
				T['_']['selection'],
				TJoinedName,
				TJoinedTable extends SQLiteTable ? TJoinedTable['_']['columns']
					: TJoinedTable extends Subquery | View ? Assume<TJoinedTable['_']['selectedFields'], SelectedFields>
					: never,
				T['_']['selectMode']
			>,
			T['_']['selectMode'] extends 'partial' ? T['_']['selectMode'] : 'multiple',
			AppendToNullabilityMap<T['_']['nullabilityMap'], TJoinedName, TJoinType>,
			T['_']['dynamic'],
			T['_']['excludedMethods']
		>,
		TDynamic,
		T['_']['excludedMethods']
	>
	: never;

export type SQLiteJoinFn<
	T extends AnySQLiteSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
> = <
	TJoinedTable extends SQLiteTable | Subquery | SQLiteViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
>(
	table: TJoinedTable,
	on: ((aliases: T['_']['selection']) => SQL | undefined) | SQL | undefined,
) => SQLiteJoin<T, TDynamic, TJoinType, TJoinedTable, TJoinedName>;

export type SelectedFieldsFlat = SelectFieldsFlatBase<SQLiteColumn>;

export type SelectedFields = SelectFieldsBase<SQLiteColumn, SQLiteTable>;

export type SelectedFieldsOrdered = SelectFieldsOrderedBase<SQLiteColumn>;

export interface SQLiteSelectHKTBase {
	tableName: string | undefined;
	resultType: 'sync' | 'async';
	runResult: unknown;
	selection: unknown;
	selectMode: SelectMode;
	nullabilityMap: unknown;
	dynamic: boolean;
	excludedMethods: string;
	result: unknown;
	selectedFields: unknown;
	_type: unknown;
}

export type SQLiteSelectKind<
	T extends SQLiteSelectHKTBase,
	TTableName extends string | undefined,
	TResultType extends 'sync' | 'async',
	TRunResult,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TNullabilityMap extends Record<string, JoinNullability>,
	TDynamic extends boolean,
	TExcludedMethods extends string,
	TResult = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields = BuildSubquerySelection<TSelection, TNullabilityMap>,
> = (T & {
	tableName: TTableName;
	resultType: TResultType;
	runResult: TRunResult;
	selection: TSelection;
	selectMode: TSelectMode;
	nullabilityMap: TNullabilityMap;
	dynamic: TDynamic;
	excludedMethods: TExcludedMethods;
	result: TResult;
	selectedFields: TSelectedFields;
})['_type'];

export interface SQLiteSelectQueryBuilderHKT extends SQLiteSelectHKTBase {
	_type: SQLiteSelectQueryBuilderBase<
		SQLiteSelectQueryBuilderHKT,
		this['tableName'],
		this['resultType'],
		this['runResult'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export interface SQLiteSelectHKT extends SQLiteSelectHKTBase {
	_type: SQLiteSelectBase<
		this['tableName'],
		this['resultType'],
		this['runResult'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export type CreateSQLiteSelectFromBuilderMode<
	TBuilderMode extends 'db' | 'qb',
	TTableName extends string | undefined,
	TResultType extends 'sync' | 'async',
	TRunResult,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
> = TBuilderMode extends 'db' ? SQLiteSelectBase<
		TTableName,
		TResultType,
		TRunResult,
		TSelection,
		TSelectMode
	>
	: SQLiteSelectQueryBuilderBase<
		SQLiteSelectQueryBuilderHKT,
		TTableName,
		TResultType,
		TRunResult,
		TSelection,
		TSelectMode
	>;

export type SQLiteSelectWithout<
	T extends AnySQLiteSelectQueryBuilder,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		SQLiteSelectBase<
			T['_']['tableName'],
			T['_']['resultType'],
			T['_']['runResult'],
			T['_']['selection'],
			T['_']['selectMode'],
			T['_']['nullabilityMap'],
			TDynamic,
			T['_']['excludedMethods'] | K,
			T['_']['result'],
			T['_']['selectedFields']
		>,
		T['_']['excludedMethods'] | K
	>;

export type SQLiteSelectExecute<T extends AnySQLiteSelect> = T['_']['result'];

export type SQLiteSelectPrepare<T extends AnySQLiteSelect> = SQLitePreparedQuery<
	{
		type: T['_']['resultType'];
		run: T['_']['runResult'];
		all: T['_']['result'];
		get: T['_']['result'][number] | undefined;
		values: any[][];
		execute: SQLiteSelectExecute<T>;
	}
>;

export type SQLiteSelectDynamic<T extends AnySQLiteSelectQueryBuilder> = SQLiteSelectKind<
	T['_']['hkt'],
	T['_']['tableName'],
	T['_']['resultType'],
	T['_']['runResult'],
	T['_']['selection'],
	T['_']['selectMode'],
	T['_']['nullabilityMap'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;

export type SQLiteSelectQueryBuilder<
	THKT extends SQLiteSelectHKTBase = SQLiteSelectQueryBuilderHKT,
	TTableName extends string | undefined = string | undefined,
	TResultType extends 'sync' | 'async' = 'sync' | 'async',
	TRunResult = unknown,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
	TResult extends any[] = unknown[],
	TSelectedFields extends ColumnsSelection = Record<string, any>,
> = SQLiteSelectQueryBuilderBase<
	THKT,
	TTableName,
	TResultType,
	TRunResult,
	TSelection,
	TSelectMode,
	TNullabilityMap,
	true,
	never,
	TResult,
	TSelectedFields
>;

export type AnySQLiteSelectQueryBuilder = SQLiteSelectQueryBuilderBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type SQLiteSetOperatorBaseWithResult<T extends any[]> = SQLiteSetOperatorInterface<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	T,
	any
>;

export type SQLiteSelect<
	TTableName extends string | undefined = string | undefined,
	TResultType extends 'sync' | 'async' = 'sync' | 'async',
	TRunResult = unknown,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = SQLiteSelectBase<TTableName, TResultType, TRunResult, TSelection, TSelectMode, TNullabilityMap, true, never>;

export type AnySQLiteSelect = SQLiteSelectBase<any, any, any, any, any, any, any, any, any, any>;

export type SetOperatorRightSelect<
	TValue extends SQLiteSetOperatorBaseWithResult<TResult>,
	TResult extends any[],
> = TValue extends SQLiteSetOperatorInterface<any, any, any, any, any, any, any, any, any, infer TValueResult, any>
	? TValueResult extends Array<infer TValueObj> ? ValidateShape<
			TValueObj,
			TResult[number],
			TypedQueryBuilder<any, TValueResult>
		>
	: never
	: TValue;

export type SetOperatorRestSelect<
	TValue extends readonly SQLiteSetOperatorBaseWithResult<TResult>[],
	TResult extends any[],
> = TValue extends [infer First, ...infer Rest]
	? First extends SQLiteSetOperatorInterface<any, any, any, any, any, any, any, any, any, infer TValueResult, any>
		? TValueResult extends Array<infer TValueObj>
			? Rest extends SQLiteSetOperatorInterface<any, any, any, any, any, any, any, any, any, any, any>[] ? [
					ValidateShape<TValueObj, TResult[number], TypedQueryBuilder<any, TValueResult>>,
					...SetOperatorRestSelect<Rest, TResult>,
				]
			: ValidateShape<TValueObj, TResult[number], TypedQueryBuilder<any, TValueResult>[]>
		: never
	: never
	: TValue;

export interface SQLiteSetOperationConfig {
	fields: Record<string, unknown>;
	operator: SetOperator;
	isAll: boolean;
	leftSelect: AnySQLiteSetOperatorBase;
	rightSelect: TypedQueryBuilder<any, any[]>;
	limit?: number | Placeholder;
	orderBy?: (SQLiteColumn | SQL | SQL.Aliased)[];
	offset?: number | Placeholder;
}

export interface SQLiteSetOperatorInterface<
	THKT extends SQLiteSelectHKTBase,
	TTableName extends string | undefined,
	TResultType extends 'sync' | 'async',
	TRunResult,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = TTableName extends string ? Record<TTableName, 'not-null'>
		: {},
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
> extends
	Omit<
		SQLiteSetOperatorBuilder<
			THKT,
			TTableName,
			TResultType,
			TRunResult,
			TSelection,
			TSelectMode,
			TNullabilityMap,
			TDynamic,
			TExcludedMethods,
			TResult,
			TSelectedFields
		>,
		'joinsNotNullableMap' | 'session' | 'dialect' | 'createSetOperator'
	>
{
	_: {
		dialect: 'sqlite';
		readonly hkt: THKT;
		readonly tableName: TTableName;
		readonly resultType: TResultType;
		readonly runResult: TRunResult;
		readonly selection: TSelection;
		readonly selectMode: TSelectMode;
		readonly nullabilityMap: TNullabilityMap;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TResult;
		readonly selectedFields: TSelectedFields;
	};
}

export type AnySQLiteSetOperatorBase = SQLiteSetOperatorInterface<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type SQLiteCreateSetOperatorFn = <
	THKT extends SQLiteSelectHKTBase,
	TTableName extends string | undefined,
	TResultType extends 'sync' | 'async',
	TRunResult,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TNullabilityMap extends Record<string, JoinNullability>,
	TValue extends SQLiteSetOperatorBaseWithResult<TResult>,
	TRest extends SQLiteSetOperatorBaseWithResult<TResult>[],
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
>(
	leftSelect: SQLiteSetOperatorInterface<
		THKT,
		TTableName,
		TResultType,
		TRunResult,
		TSelection,
		TSelectMode,
		TNullabilityMap,
		TDynamic,
		TExcludedMethods,
		TResult,
		TSelectedFields
	>,
	rightSelect: SetOperatorRightSelect<TValue, TResult>,
	...restSelects: SetOperatorRestSelect<TRest, TResult>
) => SQLiteSetOperatorBase<
	TTableName,
	TResultType,
	TRunResult,
	TSelection,
	TSelectMode,
	TNullabilityMap,
	false,
	never,
	TResult,
	TSelectedFields
>;

export type AnySQLiteSetOperator = SQLiteSetOperatorBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type SQLiteSetOperator<
	TTableName extends string | undefined = string | undefined,
	TResultType extends 'sync' | 'async' = 'sync' | 'async',
	TRunResult = unknown,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = SQLiteSetOperatorBase<TTableName, TResultType, TRunResult, TSelection, TSelectMode, TNullabilityMap, true, never>;

export type AnySQLiteSetOperatorBuilder = SQLiteSetOperatorBuilder<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type SQLiteSetOperatorWithout<
	T extends AnySQLiteSetOperator,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		SQLiteSetOperatorBase<
			T['_']['tableName'],
			T['_']['resultType'],
			T['_']['runResult'],
			T['_']['selection'],
			T['_']['selectMode'],
			T['_']['nullabilityMap'],
			TDynamic,
			T['_']['excludedMethods'] | K,
			T['_']['result'],
			T['_']['selectedFields']
		>,
		T['_']['excludedMethods'] | K
	>;

export type SQLiteSetOperatorDynamic<T extends AnySQLiteSetOperatorBuilder> = SQLiteSetOperatorBase<
	T['_']['tableName'],
	T['_']['resultType'],
	T['_']['runResult'],
	T['_']['selection'],
	T['_']['selectMode'],
	T['_']['nullabilityMap'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;
