import { is, entityKind } from '~/entity.ts';
import { MySqlColumn } from '../columns/index.ts';
import { type SQL, sql, type SQLWrapper, isSQLWrapper, SQLChunk } from '~/sql/index.ts';
import { MySqlBuiltInFunction } from './common.ts';
import { type MaybeDistinct, getValueWithDistinct } from '~/distinct.ts';

export class MySqlAggregateFunction<T = unknown> extends MySqlBuiltInFunction<T> {
	static readonly [entityKind]: string = 'MySqlAggregateFunction';
}

/**
 * Returns the number of values in `expression`.
 *
 * ## Examples
 *
 * ```ts
 * // Number employees with null values
 * db.select({ value: count() }).from(employees)
 * // Number of employees where `name` is not null
 * db.select({ value: count(employees.name) }).from(employees)
 * // Number of employees where `name` is distinct (no duplicates)
 * db.select({ value: count(distinct(employees.name)) }).from(employees)
 * ```
 */
export function count<T extends 'number' | 'bigint' | undefined = undefined>(expression?: MaybeDistinct<SQLWrapper> | '*', config?: {
	mode: T;
}): MySqlAggregateFunction<T extends 'number' ? number : bigint> {
	const { value, distinct } = getValueWithDistinct(expression);
	const chunks: SQLChunk[] = [];

	if (distinct) {
		chunks.push(sql`distinct `);
	}
	chunks.push(isSQLWrapper(value) ? value : sql`*`);

	const sql_ = sql
		.join([sql`count(`, ...chunks, sql`)` ])
		.mapWith(config?.mode === 'number' ? Number : BigInt);

	return new MySqlAggregateFunction(sql_) as any;
}

/**
 * Returns the average (arithmetic mean) of all non-null values in `expression`.
 *
 * ## Examples
 *
 * ```ts
 * // Average salary of an employee
 * db.select({ value: avg(employees.salary) }).from(employees)
 * // Average salary of an employee where `salary` is distinct (no duplicates)
 * db.select({ value: avg(distinct(employees.salary)) }).from(employees)
 * ```
 */
export function avg<T extends 'number' | 'bigint' | 'string' | undefined = undefined>(expression: MaybeDistinct<SQLWrapper>, config?: {
	mode: T;
}): MySqlAggregateFunction<(T extends 'bigint' ? bigint : T extends 'number' ? number : string) | null> {
	const { value, distinct } = getValueWithDistinct(expression);
	const chunks: SQLChunk[] = [];

	if (distinct) {
		chunks.push(sql`distinct `);
	}
	chunks.push(value);

	let sql_ = sql.join([sql`avg(`, ...chunks, sql`)`]);

	if (config?.mode === 'bigint') {
		sql_ = sql_.mapWith(BigInt);
	} else if (config?.mode === 'number') {
		sql_ = sql_.mapWith(Number);
	}

	return new MySqlAggregateFunction(sql_) as any;
}

/**
 * Returns the sum of all non-null values in `expression`.
 *
 * ## Examples
 *
 * ```ts
 * // Sum of every employee's salary
 * db.select({ value: sum(employees.salary) }).from(employees)
 * // Sum of every employee's salary where `salary` is distinct (no duplicates)
 * db.select({ value: sum(distinct(employees.salary)) }).from(employees)
 * ```
 */
export function sum<T extends 'number' | 'bigint' | 'string' | undefined = undefined>(expression: MaybeDistinct<SQLWrapper>, config?: {
	mode: T;
}): MySqlAggregateFunction<(T extends 'bigint' ? bigint : T extends 'number' ? number : string) | null> {
	const { value, distinct } = getValueWithDistinct(expression);
	const chunks: SQLChunk[] = [];

	if (distinct) {
		chunks.push(sql`distinct `);
	}
	chunks.push(value);

	let sql_ = sql.join([sql`sum(`, ...chunks, sql`)`]);

	if (config?.mode === 'bigint') {
		sql_ = sql_.mapWith(BigInt);
	} else if (config?.mode === 'number') {
		sql_ = sql_.mapWith(Number);
	}

	return new MySqlAggregateFunction(sql_) as any;
}

/**
 * Returns the maximum value in `expression`.
 *
 * ## Examples
 *
 * ```ts
 * // The employee with the highest salary
 * db.select({ value: max(employees.salary) }).from(employees)
 * ```
 */
export function max<T extends SQLWrapper>(expression: T): T extends MySqlColumn
	? MySqlAggregateFunction<T['_']['data'] | null>
	: MySqlAggregateFunction<string | null>
{
	let sql_ = sql.join([sql`max(`, expression, sql`)`]);

	if (is(expression, MySqlColumn)) {
		sql_ = sql_.mapWith(expression);
	} else {
		sql_ = sql_.mapWith(String);
	}

	return new MySqlAggregateFunction(sql_) as any;
}

/**
 * Returns the minimum value in `expression`.
 *
 * ## Examples
 *
 * ```ts
 * // The employee with the lowest salary
 * db.select({ value: min(employees.salary) }).from(employees)
 * ```
 */
export function min<T extends SQLWrapper>(expression: T): T extends MySqlColumn
	? MySqlAggregateFunction<T['_']['data'] | null>
	: MySqlAggregateFunction<string | null>
{
	let sql_ = sql.join([sql`min(`, expression, sql`)`]);

	if (is(expression, MySqlColumn)) {
		sql_ = sql_.mapWith(expression);
	} else {
		sql_ = sql_.mapWith(String);
	}

	return new MySqlAggregateFunction(sql_) as any;
}
