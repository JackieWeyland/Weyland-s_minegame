import { EntityComponentTypes, Player, system, world } from "@minecraft/server";
import { SpecialEntity } from "./features/special_entities_system";

function scanKarts() {
  // console.log('san...');
  const karts = world.getDimension('overworld').getEntities({ type: "wgames:iron_golem_kart" })

  for (const kart of karts) {
    const rideable = kart.getComponent(EntityComponentTypes.Rideable)
    const rider = rideable.getRiders()[0] as Player

    if (!rider) continue

    const velocity = kart.getVelocity()
    const maxVelocity = 1.4
    const speed = Math.hypot(velocity.x, velocity.z)
    const inputMove = rider.inputInfo.getMovementVector()

    rider.onScreenDisplay.setActionBar(`spd.: ${String(speed).slice(0, 4)} | ace.: ${String(inputMove.y).slice(0, 4)} | dir.:${String(inputMove.x).slice(0, 4)}`)

    if (Math.abs(inputMove.y) > 0.1 && speed < maxVelocity) {
      const initialImpulse = 0.01
      const view = kart.getViewDirection()
      const acceleration = 0.5
      const maxInput = Math.max(Math.abs(inputMove.x), Math.abs(inputMove.y))
      const throttle = maxInput > 0 ? inputMove.y / maxInput : 0
      const impulse = (initialImpulse + speed) * acceleration * throttle

      kart.applyImpulse({
        x: view.x * impulse,
        y: 0,
        z: view.z * impulse
      })
    }

    if (Math.abs(inputMove.x) > 0.1) {
      const speedFactor = Math.min(1, speed / maxVelocity)
      const turnSpeed = 10
      const rot = kart.getRotation()
      kart.setRotation({
        x: rot.x,
        y: rot.y - inputMove.x * turnSpeed * speedFactor
      })
    }

  }
}

system.runInterval(function () {
  scanKarts()
  SpecialEntity.ProximitScan()
  // SpecialEntity.setEntitiesBetweenLocations({
  //   "wgames:coin_drop": {
  //     maxEntitiesArround: 1,
  //     entityArroundDistance: 5,
  //     maxEntities: 2,
  //     pos1: { x: -20, y: 22, z: 1026 }, // -20 22 1026
  //     pos2: { x: -30, y: 22, z: 1038 }, // -30 22 1038
  //   }
  // })
})