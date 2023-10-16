import { entityKind } from '~/entity.ts';
import type { AddAliasToSelection } from '~/query-builders/select.types.ts';
import {
	SelfReferenceAlias,
	SelfReferenceName,
	SelfReferenceSQ,
	SelfReferenceSQColumn,
	type Subquery,
	type WithSubquery,
} from '~/subquery.ts';
import type { ColumnsSelection } from '~/view.ts';
import type { MySqlTable } from './table.ts';

export type SubqueryWithSelection<
	TSelection extends ColumnsSelection,
	TAlias extends string,
> =
	& Subquery<TAlias, AddAliasToSelection<TSelection, TAlias, 'mysql'>>
	& AddAliasToSelection<TSelection, TAlias, 'mysql'>;

export type WithSubqueryWithSelection<
	TSelection extends ColumnsSelection,
	TAlias extends string,
> =
	& WithSubquery<TAlias, AddAliasToSelection<TSelection, TAlias, 'mysql'>>
	& AddAliasToSelection<TSelection, TAlias, 'mysql'>;

export class MySqlSelfReferenceSQ extends SelfReferenceSQ {
	static readonly [entityKind]: string = 'MySqlSelfReferenceSQ';

	[SelfReferenceName]?: string;
	[SelfReferenceAlias]: string = 'recursive_self_reference';

	static create<Shape extends Record<string, unknown> = {}>(
		baseColumns: Shape,
	): MySqlSelfReferenceSQ & Record<keyof Shape, SelfReferenceSQColumn> {
		const self = new MySqlSelfReferenceSQ();

		const columns: Record<keyof Shape, SelfReferenceSQColumn> = { ...baseColumns } as any;
		for (const key in columns) {
			columns[key as keyof typeof columns] = new SelfReferenceSQColumn(key, self);
		}

		return Object.assign(self, columns);
	}

	as<TAlias extends string>(alias: TAlias) {
		this[SelfReferenceAlias] = alias;
		return this as unknown as MySqlTable;
	}
}
