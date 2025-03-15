import { Migrator, TSMigrationGenerator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import mikroOrmConfig from "./mikro-orm.config.js";
import { fileURLToPath } from "url";
import path from "path";

class CustomMigrationGenerator extends TSMigrationGenerator {
  override generateMigrationFile(
    className: string,
    diff: { up: string[]; down: string[] },
  ): string {
    return super.generateMigrationFile(className.split('_')[0], {
      up: diff.up,
      down: [],
    });
  }
}

export default defineConfig({
  ...mikroOrmConfig,
  extensions: [Migrator],
  migrations: {
    tableName: 'migrations',
    path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations'),
    snapshot: false,
    generator: CustomMigrationGenerator,
    dropTables: false,
    fileName(timestamp, name) {
      if (!name) {
        throw new Error(
          'Migration name must be specified via `mikro-orm migration:create --name=...`',
        );
      }

      return `${timestamp}-${name}`;
    },
    disableForeignKeys: false,
  },

});
