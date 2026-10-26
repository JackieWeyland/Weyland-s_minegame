import { PlayerInteractWithEntityAfterEvent, world } from "@minecraft/server";
// import { BombPatyGame } from "../games/bomb_party";
import { GERAL_CONF } from "../config";
import { bombPartyInterface } from "../games";

world.afterEvents.playerInteractWithEntity.subscribe(function (event: PlayerInteractWithEntityAfterEvent) {

  // ENTRAR NO JOGO
  const gameId = GERAL_CONF.npc_of_game[event.target.typeId]
  const joinInGame = {
    "bomb_party": bombPartyInterface
  }
  joinInGame[gameId]?.(event.player)
})