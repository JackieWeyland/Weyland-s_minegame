import { EntityComponentTypes, PlayerSpawnAfterEvent } from "@minecraft/server";
import { GERAL_CONF } from "../config";

export function onPlayerJoinInWorld(event: PlayerSpawnAfterEvent) {
  if (!event.initialSpawn) return
  const player = event.player
  player.teleport(GERAL_CONF.locations.lobby)
  const container = player.getComponent(EntityComponentTypes.Inventory).container
  container.clearAll()
  player.getEffects().forEach(e => player.removeEffect(e.typeId))
}