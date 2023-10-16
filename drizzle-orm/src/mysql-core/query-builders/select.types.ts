import type { MySqlColumn } from '~/mysql-core/columns/index.ts';
import type { MySqlTable, MySqlTableWithColumns } from '~/mysql-core/table.ts';
import type { MySqlViewBase, MySqlViewWithSelection } from '~/mysql-core/view.ts';
import type {
	SelectedFields as SelectedFieldsBase,
	SelectedFieldsFlat as SelectedFieldsFlatBase,
	SelectedFieldsOrdered as SelectedFieldsOrderedBase,
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
import type { Placeholder, SQL } from '~/sql/index.ts';
import type { Subquery } from '~/subquery.ts';
import type { Table, UpdateTableConfig } from '~/table.ts';
import type { Assume, ValidateShape } from '~/utils.ts';
import type { ColumnsSelection, View } from '~/view.ts';
import type { PreparedQueryConfig, PreparedQueryHKTBase, PreparedQueryKind } from '../session.ts';
import type { MySqlSelectBase, MySqlSelectOnly, MySqlSelectQueryBuilderBase } from './select.ts';
import type { MySqlSetOperatorBase, MySqlSetOperatorBuilder } from './set-operators.ts';

export interface MySqlSelectJoinConfig {
	on: SQL | undefined;
	table: MySqlTable | Subquery | MySqlViewBase | SQL;
	alias: string | undefined;
	joinType: JoinType;
	lateral?: boolean;
}

export type BuildAliasTable<TTable extends MySqlTable | View, TAlias extends string> = TTable extends Table
	? MySqlTableWithColumns<
		UpdateTableConfig<TTable['_']['config'], {
			name: TAlias;
			columns: MapColumnsToTableAlias<TTable['_']['columns'], TAlias, 'mysql'>;
		}>
	>
	: TTable extends View ? MySqlViewWithSelection<
			TAlias,
			TTable['_']['existing'],
			MapColumnsToTableAlias<TTable['_']['selectedFields'], TAlias, 'mysql'>
		>
	: never;

export interface MySqlSelectConfig {
	withList?: Subquery[];
	fields: Record<string, unknown>;
	fieldsFlat?: SelectedFieldsOrdered;
	where?: SQL;
	having?: SQL;
	table: MySqlTable | Subquery | MySqlViewBase | SQL;
	limit?: number | Placeholder;
	offset?: number | Placeholder;
	joins?: MySqlSelectJoinConfig[];
	orderBy?: (MySqlColumn | SQL | SQL.Aliased)[];
	groupBy?: (MySqlColumn | SQL | SQL.Aliased)[];
	withRecursive?: Subquery;
	lockingClause?: {
		strength: LockStrength;
		config: LockConfig;
	};
	distinct?: boolean;
}

export type MySqlJoin<
	T extends AnyMySqlSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
	TJoinedTable extends MySqlTable | Subquery | MySqlViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
> = T extends any ? MySqlSelectWithout<
		MySqlSelectKind<
			T['_']['hkt'],
			T['_']['tableName'],
			AppendToResult<
				T['_']['tableName'],
				T['_']['selection'],
				TJoinedName,
				TJoinedTable extends MySqlTable ? TJoinedTable['_']['columns']
					: TJoinedTable extends Subquery | View ? Assume<TJoinedTable['_']['selectedFields'], SelectedFields>
					: never,
				T['_']['selectMode']
			>,
			T['_']['selectMode'] extends 'partial' ? T['_']['selectMode'] : 'multiple',
			T['_']['preparedQueryHKT'],
			AppendToNullabilityMap<T['_']['nullabilityMap'], TJoinedName, TJoinType>,
			T['_']['dynamic'],
			T['_']['excludedMethods']
		>,
		TDynamic,
		T['_']['excludedMethods']
	>
	: never;

export type MySqlJoinFn<
	T extends AnyMySqlSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
> = <
	TJoinedTable extends MySqlTable | Subquery | MySqlViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
>(
	table: TJoinedTable,
	on: ((aliases: T['_']['selection']) => SQL | undefined) | SQL | undefined,
) => MySqlJoin<T, TDynamic, TJoinType, TJoinedTable, TJoinedName>;

export type SelectedFieldsFlat = SelectedFieldsFlatBase<MySqlColumn>;

export type SelectedFields = SelectedFieldsBase<MySqlColumn, MySqlTable>;

export type SelectedFieldsOrdered = SelectedFieldsOrderedBase<MySqlColumn>;

export type LockStrength = 'update' | 'share';

export type LockConfig = {
	noWait: true;
	skipLocked?: undefined;
} | {
	noWait?: undefined;
	skipLocked: true;
} | {
	noWait?: undefined;
	skipLocked?: undefined;
};

export interface MySqlSelectHKTBase {
	tableName: string | undefined;
	selection: unknown;
	selectMode: SelectMode;
	preparedQueryHKT: unknown;
	nullabilityMap: unknown;
	dynamic: boolean;
	excludedMethods: string;
	result: unknown;
	selectedFields: unknown;
	_type: unknown;
}

export type MySqlSelectKind<
	T extends MySqlSelectHKTBase,
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase,
	TNullabilityMap extends Record<string, JoinNullability>,
	TDynamic extends boolean,
	TExcludedMethods extends string,
	TResult = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields = BuildSubquerySelection<TSelection, TNullabilityMap>,
> = (T & {
	tableName: TTableName;
	selection: TSelection;
	selectMode: TSelectMode;
	preparedQueryHKT: TPreparedQueryHKT;
	nullabilityMap: TNullabilityMap;
	dynamic: TDynamic;
	excludedMethods: TExcludedMethods;
	result: TResult;
	selectedFields: TSelectedFields;
})['_type'];

export interface MySqlSelectQueryBuilderHKT extends MySqlSelectHKTBase {
	_type: MySqlSelectQueryBuilderBase<
		MySqlSelectQueryBuilderHKT,
		this['tableName'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['preparedQueryHKT'], PreparedQueryHKTBase>,
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export interface MySqlSelectHKT extends MySqlSelectHKTBase {
	_type: MySqlSelectBase<
		this['tableName'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['preparedQueryHKT'], PreparedQueryHKTBase>,
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export type MySqlSelectWithout<
	T extends AnyMySqlSelectQueryBuilder,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T : Omit<
	MySqlSelectBase<
		T['_']['tableName'],
		T['_']['selection'],
		T['_']['selectMode'],
		T['_']['preparedQueryHKT'],
		T['_']['nullabilityMap'],
		TDynamic,
		T['_']['excludedMethods'] | K,
		T['_']['result'],
		T['_']['selectedFields']
	>,
	T['_']['excludedMethods'] | K
>;

export type MySqlSelectPrepare<T extends AnyMySqlSelect | AnyMySqlSelectOnly> = PreparedQueryKind<
	T['_']['preparedQueryHKT'],
	PreparedQueryConfig & {
		execute: T['_']['result'];
		iterator: T['_']['result'][number];
	},
	true
>;

export type MySqlSelectDynamic<T extends AnyMySqlSelectQueryBuilder> = MySqlSelectKind<
	T['_']['hkt'],
	T['_']['tableName'],
	T['_']['selection'],
	T['_']['selectMode'],
	T['_']['preparedQueryHKT'],
	T['_']['nullabilityMap'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;

export type CreateMySqlSelectFromBuilderMode<
	TBuilderMode extends 'db' | 'qb',
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase,
> = TBuilderMode extends 'db' ? MySqlSelectBase<TTableName, TSelection, TSelectMode, TPreparedQueryHKT>
	: MySqlSelectQueryBuilderBase<MySqlSelectQueryBuilderHKT, TTableName, TSelection, TSelectMode, TPreparedQueryHKT>;

export type MySqlSelectQueryBuilder<
	THKT extends MySqlSelectHKTBase = MySqlSelectQueryBuilderHKT,
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase = PreparedQueryHKTBase,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
	TResult extends any[] = unknown[],
	TSelectedFields extends ColumnsSelection = Record<string, any>,
> = MySqlSelectQueryBuilderBase<
	THKT,
	TTableName,
	TSelection,
	TSelectMode,
	TPreparedQueryHKT,
	TNullabilityMap,
	true,
	never,
	TResult,
	TSelectedFields
>;

export type AnyMySqlSelectQueryBuilder = MySqlSelectQueryBuilderBase<any, any, any, any, any, any, any, any, any, any>;

export type MySqlSelect<
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = MySqlSelectBase<TTableName, TSelection, TSelectMode, PreparedQueryHKTBase, TNullabilityMap, true, never>;

export type AnyMySqlSelect = MySqlSelectBase<any, any, any, any, any, any, any, any>;

export type MySqlSetOperatorBaseWithResult<T extends any[]> = MySqlSetOperatorInterface<
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

export type SetOperatorRightSelect<
	TValue extends MySqlSetOperatorBaseWithResult<TResult>,
	TResult extends any[],
> = TValue extends MySqlSetOperatorInterface<any, any, any, any, any, any, any, any, infer TValueResult, any>
	? TValueResult extends Array<infer TValueObj> ? ValidateShape<
			TValueObj,
			TResult[number],
			TypedQueryBuilder<any, TValueResult>
		>
	: never
	: TValue;

export type SetOperatorRestSelect<
	TValue extends readonly MySqlSetOperatorBaseWithResult<TResult>[],
	TResult extends any[],
> = TValue extends [infer First, ...infer Rest]
	? First extends MySqlSetOperatorInterface<any, any, any, any, any, any, any, any, infer TValueResult, any>
		? TValueResult extends Array<infer TValueObj>
			? Rest extends MySqlSetOperatorInterface<any, any, any, any, any, any, any, any, any, any>[] ? [
					ValidateShape<TValueObj, TResult[number], TypedQueryBuilder<any, TValueResult>>,
					...SetOperatorRestSelect<Rest, TResult>,
				]
			: ValidateShape<TValueObj, TResult[number], TypedQueryBuilder<any, TValueResult>[]>
		: never
	: never
	: TValue;

export interface MySqlSetOperationConfig {
	fields: Record<string, unknown>;
	operator: SetOperator;
	isAll: boolean;
	leftSelect: AnyMySqlSetOperatorBase;
	rightSelect: TypedQueryBuilder<any, any[]>;
	limit?: number | Placeholder;
	orderBy?: (MySqlColumn | SQL | SQL.Aliased)[];
	offset?: number | Placeholder;
	selfReferenceName?: string;
}

export interface MySqlSetOperatorInterface<
	THKT extends MySqlSelectHKTBase,
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase = PreparedQueryHKTBase,
	TNullabilityMap extends Record<string, JoinNullability> = TTableName extends string ? Record<TTableName, 'not-null'>
		: {},
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
> extends
	Omit<
		MySqlSetOperatorBuilder<
			THKT,
			TTableName,
			TSelection,
			TSelectMode,
			TPreparedQueryHKT,
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
		readonly hkt: THKT;
		readonly tableName: TTableName;
		readonly selection: TSelection;
		readonly selectMode: TSelectMode;
		readonly preparedQueryHKT: TPreparedQueryHKT;
		readonly nullabilityMap: TNullabilityMap;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TResult;
		readonly selectedFields: TSelectedFields;
	};
}

export type AnyMySqlSetOperatorBase = MySqlSetOperatorInterface<
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

export type MySqlCreateSetOperatorFn = <
	THKT extends MySqlSelectHKTBase,
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase,
	TNullabilityMap extends Record<string, JoinNullability>,
	TValue extends MySqlSetOperatorBaseWithResult<TResult>,
	TRest extends MySqlSetOperatorBaseWithResult<TResult>[],
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
>(
	leftSelect: MySqlSetOperatorInterface<
		THKT,
		TTableName,
		TSelection,
		TSelectMode,
		TPreparedQueryHKT,
		TNullabilityMap,
		TDynamic,
		TExcludedMethods,
		TResult,
		TSelectedFields
	>,
	rightSelect: SetOperatorRightSelect<TValue, TResult>,
	...restSelects: SetOperatorRestSelect<TRest, TResult>
) => MySqlSetOperatorBase<
	TTableName,
	TSelection,
	TSelectMode,
	TPreparedQueryHKT,
	TNullabilityMap,
	false,
	never,
	TResult,
	TSelectedFields
>;

export type AnyMySqlSetOperator = MySqlSetOperatorBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type MySqlSetOperator<
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TPreparedQueryHKT extends PreparedQueryHKTBase = PreparedQueryHKTBase,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = MySqlSetOperatorBase<TTableName, TSelection, TSelectMode, TPreparedQueryHKT, TNullabilityMap, true, never>;

export type AnyMySqlSetOperatorBuilder = MySqlSetOperatorBuilder<
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

export type MySqlSetOperatorWithout<
	T extends AnyMySqlSetOperator,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		MySqlSetOperatorBase<
			T['_']['tableName'],
			T['_']['selection'],
			T['_']['selectMode'],
			T['_']['nullabilityMap'],
			T['_']['preparedQueryHKT'],
			TDynamic,
			T['_']['excludedMethods'] | K,
			T['_']['result'],
			T['_']['selectedFields']
		>,
		T['_']['excludedMethods'] | K
	>;

export type MySqlSetOperatorDynamic<T extends AnyMySqlSetOperatorBuilder> = MySqlSetOperatorBase<
	T['_']['tableName'],
	T['_']['selection'],
	T['_']['selectMode'],
	T['_']['preparedQueryHKT'],
	T['_']['nullabilityMap'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;

export type AnyMySqlSelectOnly = MySqlSelectOnly<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type MySqlSelectOnlyWithout<
	T extends AnyMySqlSelectOnly,
	TDynamic extends boolean,
	K extends keyof T & string,
> = TDynamic extends true ? T
	: Omit<
		MySqlSelectOnly<
			T['_']['tableName'],
			T['_']['selection'],
			T['_']['preparedQueryHKT'],
			T['_']['builderMode'],
			TDynamic,
			T['_']['excludedMethods'] | K,
			T['_']['result'],
			T['_']['selectedFields']
		>,
		T['_']['excludedMethods'] | K
	>;

export type MySqlSelectOnlyDynamic<T extends AnyMySqlSelectOnly> = MySqlSelectOnly<
	T['_']['tableName'],
	T['_']['selection'],
	T['_']['preparedQueryHKT'],
	T['_']['builderMode'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;
