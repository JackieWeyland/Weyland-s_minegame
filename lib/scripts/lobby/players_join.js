import { EntityComponentTypes } from "@minecraft/server";
import { GERAL_CONF } from "../config";
export function onPlayerJoinInWorld(event) {
    if (!event.initialSpawn)
        return;
    const player = event.player;
    const location = GERAL_CONF.locations.lobby;
    // player.teleport({
    //   x: randomBetween(location.x - 5, location.x + 5),
    //   y: location.y,
    //   z: randomBetween(location.x - 5, location.x + 5)
    // })
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll();
    player.getEffects().forEach(e => player.removeEffect(e.typeId));
}
//# sourceMappingURL=players_join.js.map