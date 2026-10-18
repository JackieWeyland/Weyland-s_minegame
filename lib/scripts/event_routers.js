import { world } from "@minecraft/server";
import { BombPartyManager } from "./games";
import { PressurePlateActions } from "./features";
import { SpecialEntity } from "./features/special_entities_system";
import { onPlayerJoinInWorld } from "./lobby/players_join";
world.afterEvents.entityHitEntity.subscribe(function (event) {
    BombPartyManager.OnHitEvent(event);
    SpecialEntity.OnHit(event);
});
world.afterEvents.itemUse.subscribe(function (event) {
    BombPartyManager.OnItemUse(event);
});
world.afterEvents.pressurePlatePush.subscribe(function (event) {
    PressurePlateActions.OnPush(event);
});
world.afterEvents.playerLeave.subscribe(function (event) {
    BombPartyManager.OnLeave(event);
});
world.afterEvents.playerSpawn.subscribe(function (event) {
    onPlayerJoinInWorld(event);
});
//# sourceMappingURL=event_routers.js.map