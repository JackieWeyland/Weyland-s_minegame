import { PlayerInteractWithEntityAfterEvent, world } from "@minecraft/server";
import { BombPatyGame } from "../games/bomb_party";
import { GERAL_CONF } from "../config";

world.afterEvents.playerInteractWithEntity.subscribe(function (event: PlayerInteractWithEntityAfterEvent) {

  console.log('pass', event.target.typeId);

  // ENTRAR NO JOGO
  const gameId = GERAL_CONF.npc_of_game[event.target.typeId]
  const joinInGame = {
    "bomb_party": BombPatyGame.OnJoin
  }
  joinInGame[gameId]?.(event.player)
})