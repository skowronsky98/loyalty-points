import { EntityManager, MikroORM, Options } from "@mikro-orm/postgresql";
import mikroOrmConfig from "./mikro-orm.config.js";
import { LoyaltyPointsEntity } from "./entitites/loyalty-points.entity.js";
import { LoyaltyPointsRepository } from "./repos/loyalty-points.repo.js";
import { LoyaltyPointsDeptRepository } from "./repos/loyalty-points-dept.repo.js";
import { LoyaltyPointsDeptEntity } from "./entitites/loyalty-points-dept.entity.js";

export interface Services {
  orm: MikroORM;
  em: EntityManager;
  loyaltyPointsRepo: LoyaltyPointsRepository;
  loyaltyPointsDeptRepo: LoyaltyPointsDeptRepository;
}

let cache: Services;

export async function initORM(options?: Options): Promise<Services> {
  if (cache) {
    return cache;
  }

  const orm = await MikroORM.init({
    ...mikroOrmConfig,
    ...options,
  });

  return cache = {
    orm,
    em: orm.em,
    loyaltyPointsRepo: orm.em.getRepository(LoyaltyPointsEntity),
    loyaltyPointsDeptRepo: orm.em.getRepository(LoyaltyPointsDeptEntity),
  };
}
