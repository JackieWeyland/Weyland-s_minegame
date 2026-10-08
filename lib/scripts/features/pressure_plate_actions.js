import { GERAL_CONF } from "../config";
function superJump(player, pw1, pw2) {
    const view = player.getViewDirection();
    player.applyKnockback({ x: view.x * pw2, z: view.z * pw2 }, pw1);
}
export class PressurePlateActions {
    static OnPush(event) {
        const locKey = `${event.block.x} ${event.block.y} ${event.block.z}`;
        const conf = GERAL_CONF.pressure_plates[locKey];
        if (conf.action === 'super_jump') {
            return superJump(event.source, conf.vertical_power, conf.horizontal_power);
        }
    }
}
//# sourceMappingURL=pressure_plate_actions.js.map