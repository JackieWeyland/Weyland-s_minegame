import { world } from "@minecraft/server";
import { BombPartyManager } from "./games";

world.afterEvents.entityHitEntity.subscribe(function (event) {
  console.log('[event_routers]: entity hit entity');

  BombPartyManager.OnHitEvent(event)
})

world.afterEvents.itemUse.subscribe(function (event) {
  console.log('[event_routers]: item use');

  BombPartyManager.OnItemUse(event)
})