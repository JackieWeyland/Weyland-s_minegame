import { Player, PressurePlatePushAfterEvent } from "@minecraft/server";
import { GERAL_CONF } from "../config";

function superJump(player: Player, pw1: number, pw2: number) {
  const view = player.getViewDirection()
  player.applyKnockback({ x: view.x * pw2, z: view.z * pw2 }, pw1)
}

export class PressurePlateActions {
  static OnPush(event: PressurePlatePushAfterEvent) {
    const locKey = `${event.block.x} ${event.block.y} ${event.block.z}`
    const conf = GERAL_CONF.pressure_plates[locKey as "-25 22 1025"]

    if (conf.action === 'super_jump') { return superJump(event.source as Player, conf.vertical_power, conf.horizontal_power) }
  }
}