import { MikroORM } from "@mikro-orm/postgresql";

export const clearDatabase = async (orm: MikroORM) => {
  const omitTables = new Set(['migrations']);

  const collections = orm.em.getMetadata().getAll();

  const clearCollections = Object.values(collections)
    .filter(collection => !omitTables.has(collection.tableName));

  for (const collection of clearCollections) {
    await orm.em.execute(`TRUNCATE TABLE "${collection.tableName}" CASCADE`);
  }
};
