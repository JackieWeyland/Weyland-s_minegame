import { EffectType, EntityHitEntityAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { GERAL_CONF } from "../config";

interface PowerUpDefinitions {
  [key: string]: {
    locations: Vector3[]
  }
}

export class PowerUpsManager {
  static setPowerUp(definitions: PowerUpDefinitions) {
    const dimension = world.getDimension('overworld')
    Object.keys(definitions).forEach(type => {
      const locations = definitions[type].locations
      locations.forEach(location => {
        const entities = dimension.getEntities({ type, location, maxDistance: 2 })
        if (entities.length > 0) return
        dimension.spawnEntity(type, location)
      })
    })
  }
  static onHit(event: EntityHitEntityAfterEvent) {
    if (event.damagingEntity.typeId !== "minecraft:player") return
    const powerUpList = Object.keys(GERAL_CONF.power_up_types)
    if (!powerUpList.includes(event.hitEntity.typeId)) return
    const defitinion = GERAL_CONF.power_up_types[event.hitEntity.typeId as "wgames:speed_power_up"]
    const player = event.damagingEntity as Player
    const powerUper = event.hitEntity

    // return console.log);

    player.addEffect(defitinion.effect, defitinion.duration, { amplifier: defitinion.power })
    powerUper.remove()
  }
}