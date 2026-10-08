import { world } from "@minecraft/server";
import { BombPartyManager } from "./games";
import { PressurePlateActions } from "./features";
import { PowerUpsManager } from "./features/power_ups_manager";
import { onPlayerJoinInWorld } from "./lobby/players_join";

world.afterEvents.entityHitEntity.subscribe(function (event) {
  BombPartyManager.OnHitEvent(event)
  PowerUpsManager.onHit(event)
})

world.afterEvents.itemUse.subscribe(function (event) {
  BombPartyManager.OnItemUse(event)
})

world.afterEvents.pressurePlatePush.subscribe(function (event) {
  PressurePlateActions.OnPush(event)
})

world.afterEvents.playerLeave.subscribe(function (event) {
  BombPartyManager.OnLeave(event)
})

world.afterEvents.playerSpawn.subscribe(function (event) {
  onPlayerJoinInWorld(event)
})