import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { BombPartyManager, BombPatyGame } from "./game_manager";
import { GERAL_CONF } from "../../config";

export function bombPartyInterface(player: Player) {
  const actionForm = new ActionFormData() // CRIAM UMA INTERFACE NOVA

  actionForm.title('§lBOMB PARTY')

  const playersOn = BombPartyManager.PlayersOn()
  actionForm.body(`Jogadores online: ${playersOn}`)

  actionForm.button('§l§aEntrar')
  actionForm.button('§l§eCriar')

  actionForm.show(player).then(function (result) {
    if (result.canceled) return // INTERROMPE SE O JOGADOR CANCELAR
    const actionList = [gameRunningInterface, createGameInterface]
    const action = actionList[result.selection]
    action(player)
  })
}

function createGameInterface(player: Player) { // INTERFACE PARA CRIAR JOGOS
  const actionForm = new ActionFormData() // CRIAM UMA INTERFACE NOVA

  actionForm.title('§lBOMB PARTY')

  const gamesRunning = BombPartyManager.GetGameList()
  const mapList = Object.keys(GERAL_CONF.games.bomb_party.maps).filter(g => !gamesRunning.includes(g))
  mapList.forEach(key => actionForm.button(key))

  actionForm.show(player).then(function (result) {
    if (result.canceled) return // INTERROMPE SE O JOGADOR CANCELAR
    const gameId = mapList[result.selection]
    if (BombPartyManager.GetGameList().includes(gameId)) return // IMPEDE SE O JOGO JÁ EXISTIR
    const game = new BombPatyGame(gameId)
    game.join(player)
    game.start() // TENTA INICIAR O JOGO
  })
}

function gameRunningInterface(player: Player) { // INTERFACE PRA JOGOS ACONTECENDO
  const actionForm = new ActionFormData() // CRIAM UMA INTERFACE NOVA

  actionForm.title('§lBOMB PARTY')

  const gamesRunning = BombPartyManager.GetGameList()
  gamesRunning.forEach(id => actionForm.button(id))

  actionForm.show(player).then(function (result) {
    if (result.canceled) return // INTERROMPE SE O JOGADOR CANCELAR
    const game = BombPartyManager.GetGame(gamesRunning[result.selection])
    game.join(player)
    game.start() // TENTA INICIAR O JOGO
  })
}