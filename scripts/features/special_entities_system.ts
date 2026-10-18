import { EffectType, Entity, EntityHitEntityAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { GERAL_CONF } from "../config";
import { randomBetween } from "../utils";

interface SpawnLocationList {
  [key: string]: {
    locations: Vector3[]
  }
}

interface BetweenSpawnLocationList {
  [key: string]: {
    entityArroundDistance: number
    maxEntitiesArround: number
    maxEntities: number
    pos1: Vector3
    pos2: Vector3
  }
}

class SpecialEntitiesDefinitions {
  static "wgames:speed_power_up" = function (player: Player, entity: Entity) {
    const effecType = 'speed', amplifier = 2, duration = 160
    player.addEffect(effecType, duration, { amplifier })
    entity.remove()
  }

  static "wgames:coin_drop" = function (player: Player, entity: Entity) {
    player.playSound('random.orb')
    player.playSound('random.pop')
    entity.remove()
  }
}

export class SpecialEntity {
  static SetEntities(definitions: SpawnLocationList) {
    const dimension = world.getDimension('overworld')
    Object.keys(definitions).forEach(type => {
      const locations = definitions[type].locations
      for (const location of locations) {
        const entities = dimension.getEntities({ type, location, maxDistance: 2 })
        if (entities.length > 0) continue
        dimension.spawnEntity(type, location)
      }
    })
  }
  static setEntitiesBetweenLocations(definitions: BetweenSpawnLocationList) {
    const dimension = world.getDimension('overworld')
    // const getMaxEntityLenght = (arg0: string[]) => arg0.reduce((total, type) => { return total + dimension.getEntities({ type }).length }, 0)

    for (const type in definitions) {
      const locationA = definitions[type].pos1
      const locationB = definitions[type].pos2
      let maxEntities = definitions[type].maxEntities
      while (maxEntities > 0) {
        maxEntities--
        const location = {
          x: randomBetween(locationA.x, locationB.x),
          y: randomBetween(locationA.y, locationB.y),
          z: randomBetween(locationA.z, locationB.z)
        }
        const maxDistance = definitions[type].entityArroundDistance
        const maxEntitiesArround = definitions[type].maxEntitiesArround
        const entitiesArround = dimension.getEntities({ type, location, maxDistance }).length
        if (entitiesArround < maxEntitiesArround) { dimension.spawnEntity(type, location) }
      }
      // do {
      //   if (token <= 0) break
      //   token--
      //   const location = {
      //     x: randomBetween(locationA.x, locationB.x),
      //     y: randomBetween(locationA.y, locationB.y),
      //     z: randomBetween(locationA.z, locationB.z)
      //   }
      //   dimension.spawnEntity(type, location)
      // } while ()
      // while (dimension.getEntities({ type }).length < definitions[type].maxArroundLenght) {
      //   if (token <= 0) break
      //   token--
      //   dimension.spawnEntity(type, {
      //     x: randomBetween(locationA.x, locationB.x),
      //     y: randomBetween(locationA.y, locationB.y),
      //     z: randomBetween(locationA.z, locationB.z)
      //   })
      //   console.log('pass');

      // }
      // const entityLenght = dimension.getEntities({ type }).length
      // if (entityLenght >= definitions[type].maxLenght) return
    }
    // if (maxEntities <= 0) return
    // if (getMaxEntityLenght() >= maxEntities) return

    // let entityCout: number = 0
    // for (let i = 0; i <= maxEntities; i++) {
    //   const types = Object.keys(definitions)
    //   const numberOfEntity = types.reduce((total, type) => { return total + dimension.getEntities({ type }).length }, 0)
    //   for (const type of types) {

    //   }
    // }
  }
  static ProximitScan() {
    const players = world.getAllPlayers()
    for (const player of players) {
      const location = player.location, maxDistance = 1, excludeFamilies = ['player']
      const entities = player.dimension.getEntities({ location, maxDistance, excludeFamilies })
      if (entities.length === 0) continue
      for (const entity of entities) {
        const action = SpecialEntitiesDefinitions[entity.typeId]
        if (typeof action !== "function") continue
        action(player, entity)
      }
    }
  }
  static OnHit(event: EntityHitEntityAfterEvent) {
    if (event.damagingEntity.typeId !== "minecraft:player") return
    const action = SpecialEntitiesDefinitions[event.hitEntity.typeId]
    if (typeof action === "function") action(event.damagingEntity, event.hitEntity)
  }
}