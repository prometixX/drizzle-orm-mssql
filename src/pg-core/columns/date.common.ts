import type { ColumnBuilderBaseConfig, ColumnBuilderHKTBase } from '~/column-builder';
import { sql } from '~/sql';

import { PgColumnBuilder } from './common';

export abstract class PgDateColumnBaseBuilder<
	THKT extends ColumnBuilderHKTBase,
	T extends ColumnBuilderBaseConfig,
	TRuntimeConfig extends object = {},
> extends PgColumnBuilder<THKT, T, TRuntimeConfig> {
	defaultNow() {
		return this.default(sql`now()`);
	}
}
