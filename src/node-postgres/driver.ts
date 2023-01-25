import { types } from 'pg';
import { Logger } from '~/logger';
import { PgDatabase } from '~/pg-core/db';
import { PgDialect } from '~/pg-core/dialect';
import { NodePgClient, NodePgQueryResultHKT, NodePgSession } from './session';

export interface PgDriverOptions {
	logger?: Logger;
}

export class NodePgDriver {
	constructor(
		private client: NodePgClient,
		private dialect: PgDialect,
		private options: PgDriverOptions = {},
	) {
		this.initMappers();
	}

	createSession(): NodePgSession {
		return new NodePgSession(this.client, this.dialect, { logger: this.options.logger });
	}

	initMappers() {
		types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => val);
		types.setTypeParser(types.builtins.TIMESTAMP, (val) => val);
		types.setTypeParser(types.builtins.DATE, (val) => val);
	}
}

export interface DrizzleConfig {
	logger?: Logger;
}

export type NodePgDatabase = PgDatabase<NodePgQueryResultHKT, NodePgSession>;

export function drizzle(client: NodePgClient, config: DrizzleConfig = {}): NodePgDatabase {
	const dialect = new PgDialect();
	const driver = new NodePgDriver(client, dialect, { logger: config.logger });
	const session = driver.createSession();
	return new PgDatabase(dialect, session);
}
