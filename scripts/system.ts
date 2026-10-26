import { EntityComponentTypes, Player, system, world } from "@minecraft/server";
import { SpecialEntity } from "./features/special_entities_system";
import { MobsKart, MobsKartManager } from "./games/mobs_karts";


system.runInterval(function () {
  SpecialEntity.ProximitScan()
  MobsKartManager.update()
})

system.run(function () {
  const dimension = world.getDimension('overworld')
  dimension.getEntities({ type: 'wgames:iron_golem_kart' }).forEach(e => e.remove())
  const player = world.getPlayers()[0]
  const entity = dimension.spawnEntity('wgames:iron_golem_kart', player.location)
  MobsKartManager.register({
    entity,
    maxSpeed: 1.4,
    turnSpeed: 6,
    acceleration: 0.3,
  })
})