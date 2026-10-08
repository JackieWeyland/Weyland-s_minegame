import { world } from "@minecraft/server";
import { GERAL_CONF } from "../config";
export class PowerUpsManager {
    static setPowerUp(definitions) {
        const dimension = world.getDimension('overworld');
        Object.keys(definitions).forEach(type => {
            const locations = definitions[type].locations;
            locations.forEach(location => {
                const entities = dimension.getEntities({ type, location, maxDistance: 2 });
                if (entities.length > 0)
                    return;
                dimension.spawnEntity(type, location);
            });
        });
    }
    static onHit(event) {
        if (event.damagingEntity.typeId !== "minecraft:player")
            return;
        const powerUpList = Object.keys(GERAL_CONF.power_up_types);
        if (!powerUpList.includes(event.hitEntity.typeId))
            return;
        const defitinion = GERAL_CONF.power_up_types[event.hitEntity.typeId];
        const player = event.damagingEntity;
        const powerUper = event.hitEntity;
        // return console.log);
        player.addEffect(defitinion.effect, defitinion.duration, { amplifier: defitinion.power });
        powerUper.remove();
    }
}
//# sourceMappingURL=power_ups_manager.js.map