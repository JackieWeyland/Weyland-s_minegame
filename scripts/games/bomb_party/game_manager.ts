import { EntityComponentTypes, EntityHitEntityAfterEvent, EquipmentSlot, GameMode, ItemLockMode, ItemStack, ItemUseAfterEvent, Player, PlayerLeaveAfterEvent, system, Vector3 } from "@minecraft/server";
import { GERAL_CONF } from "../../config";
import { randomBetween, OnTickTimerEvent, TimerManager } from "../../utils";
import { PowerUpsManager } from "../../features/power_ups_manager";

enum GameState {
  Waiting, // ESPERANDO COMEÇAR
  Starting, // COMEÇÃNDO RODADA
  Running, // RODADA ACONTECENDO
  BetweenRounds, // ENTRE RODADAS
  Finished // FIM DE JOGO
}


function screenDetoneTimer(player: Player, time: number) {
  const text = [`§l§f> §f${time} §f<`, `§l §f>§c${time}§f< `][time % 2] // ALTERNAR COR
  player.onScreenDisplay.setActionBar(text)
  player.playSound('random.click')
}

function screenStartTimer(player: Player, time: number) {
  const text = [`§l§f> §a${time} §f<`, `§l §f>§a${time}§f< `][time % 2]
  player.onScreenDisplay.setActionBar(text)
  time === 0 ? player.playSound('note.bell') : player.playSound('note.bass')
}

function bombManDetoned(players: Player[], bombMan: Player) {
  bombMan.onScreenDisplay.setTitle('§l§fVocê §cexplodiu§f!')
  bombMan.dimension.spawnParticle(
    "minecraft:huge_explosion_emitter",
    bombMan.location
  )
  bombMan.applyKnockback({ x: 0, z: 0 }, 1.3)
  bombMan.playAnimation('animation.bomb_man.detoned')
  players.forEach(player => {
    player.sendMessage(`§c${bombMan.name} §fexplodiu!`)
    player.playSound('random.explode')
  })
  const container = bombMan.getComponent(EntityComponentTypes.Inventory).container
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i)
    if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type) continue
    container.setItem(i, undefined)
  }
}

function onTransferBomb(players: Player[], bombMan: Player, oldBombMan?: Player) {
  const gameConf = GERAL_CONF.games.bomb_party
  if (oldBombMan && oldBombMan.isValid) { // LIMPAR O IVENTARIO DO JOGADOR
    console.log('limpar o inventarido de', oldBombMan.name);
    const container = oldBombMan.getComponent(EntityComponentTypes.Inventory).container
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i)
      if (item?.typeId !== gameConf.items.bomb_item_type) continue
      container.setItem(i, undefined)
    }
  }

  console.log('adicionar a bomba a', bombMan.name);
  const container = bombMan.getComponent(EntityComponentTypes.Inventory).container
  const bombItem = new ItemStack(gameConf.items.bomb_item_type)
  bombItem.lockMode = ItemLockMode.slot
  container.setItem(0, bombItem)

  bombMan.onScreenDisplay.setTitle("§l§fVocê está com a §cBOMBA§f!")
  players.forEach(player => { // NOTIFICAR OS JOGADORES
    player.sendMessage(`§f${bombMan.name} está com a §cBOMBA§f!`)
    player.playSound("block.bell.hit")
  })
}

function onExitPlayer(player: Player) {
  player.teleport(GERAL_CONF.locations.lobby) // RETORNA PARA O LOBBY
  player.stopMusic()
  player.getEffects().forEach(e => player.removeEffect(e.typeId))
  const container = player.getComponent(EntityComponentTypes.Inventory).container
  container.clearAll() // LIMPA O IVENTARIO DO JOGADOR
}

function onPlayerJoin(player: Player, pos: { start: Vector3, end: Vector3 }) {
  player.setGameMode(GameMode.Adventure)
  player.runCommand('effect @s resistance infinite 255 true')
  player.runCommand('effect @s saturation infinite 255 true')
  player.getEffects().forEach(e => console.log(e.duration))
  player.teleport({
    x: randomBetween(pos.start.x, pos.end.x),
    y: randomBetween(pos.start.y, pos.end.y),
    z: randomBetween(pos.start.z, pos.end.z)
  })
  const container = player.getComponent(EntityComponentTypes.Inventory).container
  container.clearAll() // LIMPA O IVENTARIO DO JOGADOR
  const exitItem = new ItemStack(GERAL_CONF.games.bomb_party.items.exit_item_type) // ITEM PRA SAIR DO JOGO
  exitItem.lockMode = ItemLockMode.slot // TRAVA O ITEM NO SLOT
  container.setItem(8, exitItem)
}

class MusicManager {
  private static lastTrackers = new Map<string, number>()
  static playRandomMusic(players: Player[], mapId: string) {
    const musics = GERAL_CONF.games.bomb_party.sounds.musics
    const tracker = this.lastTrackers.get(mapId)
    let index = 0
    do { index = Math.floor(Math.random() * musics.length) }
    while (index === tracker)
    const music = musics[index]
    players.forEach(player => {
      console.log(music);
      player.stopMusic()
      system.run(() => player.playMusic(music))
    })
    this.lastTrackers.set(mapId, index)
  }
  static stopSound(players: Player[]) {
    players.forEach(player => player.stopMusic())
  }
}

export class BombPatyGame { // CRIADOR DE INSTANCIAS DE PARTIDAS
  private players = new Set<Player>() // LISTA DE JOGADORES
  private gameId: string
  private bombMan: Player | null = null // PLAYER COM A BOMBA
  private state: GameState = GameState.Waiting
  constructor(gameId: string) {
    this.gameId = gameId
    BombPartyManager.AddGame(gameId, this)
    console.log('[BombaPartyGame]: New game stance');
  }

  start() { // INICIA O JOGO
    console.log('[BombaPartyGame]: Starting...');

    // if (this.gameStarted) return // VERIFICA SE O JOGO COMEÇOU
    if (this.state !== GameState.Waiting) return // VERIFICA SE O JOGO ESTÁ ESPERANDO 
    const gameConf = GERAL_CONF.games.bomb_party
    if (this.players.size < gameConf.min_players) return // INTERROMPE SE NÃO HAVER JOGADORES O SUFICIENTE
    // this.gameStarted = true // DEFINE COMO JOGO INICIADO
    this.state = GameState.Starting // DEFINE COMO INICIANDO
    this.startRound() // INICIA UMA RODADA

    console.log('[BombaPartyGame]: Game started!');
  }

  startRound() { // INICIA UMA NOVA PARTIDA
    console.log('[BombaPartyGame]: Starting Round...');
    if (this.state !== GameState.Starting && this.state !== GameState.BetweenRounds) return
    this.state = GameState.Starting
    const gameConf = GERAL_CONF.games.bomb_party
    const initialTimer = ({ cancelTimer, currentTime }: OnTickTimerEvent) => {
      if (this.state === GameState.Finished) return cancelTimer()
      this.players.forEach(player => screenStartTimer(player, (5 - currentTime)))
    }
    const bombTimer = ({ cancelTimer, currentTime }: OnTickTimerEvent) => {
      if (this.state === GameState.Finished) return cancelTimer()
      this.players.forEach(player => screenDetoneTimer(player, (gameConf.game_duration - currentTime)))
    }
    const onStartRound = () => {
      if (this.state !== GameState.Starting) return
      if (this.players.size < GERAL_CONF.games.bomb_party.min_players) return this.end()
      const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)]
      this.bombMan = bombMan // SETAR O HOMEM BOMBA ALEATORIO
      this.state = GameState.Running // DEFINE COMO PARTIDA INICIALIZADA
      onTransferBomb([...this.players], bombMan)
      // TimerCouter.Inverse(gameConf.game_duration, bombTimer, onDetoneBomb)
      TimerManager.SetTimer(gameConf.game_duration, bombTimer, onDetoneBomb)
      PowerUpsManager.setPowerUp(gameConf.power_ups)

      console.log('[BombaPartyGame]: Round started!');
      MusicManager.playRandomMusic([...this.players], this.gameId)
    }
    const onDetoneBomb = () => {
      if (this.state !== GameState.Running) return
      console.log('[BombaPartyGame]: Bomb detoned!');

      if (this.bombMan) {
        console.log('[BombaPartyGame]:', this.bombMan.name, 'died!');
        bombManDetoned([...this.players], this.bombMan)
      }
      this.endRound() // FINALIZA A PARTIDA
      MusicManager.stopSound([...this.players])
    }
    TimerManager.SetTimer(5, initialTimer, onStartRound)
  }

  end() { // FINALIZA O JOGO
    console.log('[BombaPartyGame]: ending Game...');
    this.players.forEach(player => {
      BombPartyManager.RemovePlayer(player.id)
      if (player.isValid) onExitPlayer(player)
    })
    this.players.clear()
    this.state = GameState.Finished
    BombPartyManager.RemoveGame(this.gameId)
    console.log('[BombaPartyGame]: Game Kill!');
  }

  endRound() { // FINALIZA A PARTIDA
    console.log('[BombaPartyGame]: ending Round...');

    const gameConf = GERAL_CONF.games.bomb_party
    this.bombMan = null
    this.state = GameState.BetweenRounds
    system.runTimeout(() => {
      if (this.state !== GameState.BetweenRounds) return
      if (this.players.size >= gameConf.min_players) { // VERIFICA SE HÁ UM MINIMO DE JOGADORES
        this.startRound() // INICIA UMA NOVA PARTIDA
      } else { this.end() } // FINALIZA O JOGO
    }, 60)
  }

  join(player: Player) { // ADICIONA UM JOGADOR AO JOGO
    if (this.state === GameState.Finished) return
    if (BombPartyManager.GetPlayerGame(player.id)) return
    if (this.players.has(player)) return // IMPEDE QUE O JOGADOR ENTRE DUAS VEZES
    const gameConf = GERAL_CONF.games.bomb_party
    if (this.players.size >= gameConf.max_players) return // IMPEDE SE O JOGO ESTIVER LOTADO
    this.players.add(player) // SALVA ESSE JOGADOR
    BombPartyManager.AddPlayer(player.id, this) // REGISTARA O JOGADOR A ESSE JOGO
    const pos = gameConf.maps[this.gameId as 'Arena_1'].spawn_area
    onPlayerJoin(player, pos)
  }

  onHit(attacker: Player, victim: Player) { // EXECUTA QUANDO UM JOGADOR BATE EM OUTRO
    if (this.state !== GameState.Running) return
    console.log('[BombaPartyGame]: on Hit');
    if (attacker.id !== this.bombMan?.id) return // INTERROMPE SE NÃO FOR O HOMEM BOMBA
    const item = attacker.getComponent(EntityComponentTypes.Equippable).getEquipmentSlot(EquipmentSlot.Mainhand).getItem()
    if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type) return
    this.bombMan = victim // TRANSFERE A BOMBA
    onTransferBomb([...this.players], victim, attacker)
  }

  leave(playerId: string) {
    const player = [...this.players].find(p => p.id === playerId)
    BombPartyManager.RemovePlayer(playerId)
    if (player) {
      this.players.delete(player)
      if (player.isValid) onExitPlayer(player)
    }
    if (this.players.size === 0) return this.end()
    if (playerId !== this.bombMan?.id) return
    this.bombMan = null
    if (this.state !== GameState.Running) return
    const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)]
    if (bombMan) {
      this.bombMan = bombMan
      onTransferBomb([...this.players], bombMan)
    }
  }
}

export class BombPartyManager { // GERENCIADOR DE PARTIDAS
  private static RunningGames = new Map<string, BombPatyGame>() // PARDITAS ACONTECENDO
  private static PlayersInGames = new Map<string, BombPatyGame>() // LISTA DE JOGADORES EM PARTIDAS
  static AddGame(id: string, game: BombPatyGame) { // SALVA UM GAME
    this.RunningGames.set(id, game)
  }
  static GetGame(id: string) { // OBTEM UM JOGO SALVO
    return this.RunningGames.get(id)
  }
  static GetGameList() {
    return [...this.RunningGames.keys()]
  }
  static GetPlayerGame(playerId: string) { // OBTEM A PARTIDA DE UM JOGADOR
    return this.PlayersInGames.get(playerId)
  }
  static AddPlayer(playerId: string, game: BombPatyGame) { // SALVA UM JOGADOR EM UMA PARTIDA
    if (this.PlayersInGames.has(playerId)) return
    this.PlayersInGames.set(playerId, game)
  }
  static RemovePlayer(playerId: string) { // DELETA UM JOGADOR DE UMA PARTIDA
    this.PlayersInGames.delete(playerId)
  }
  static RemoveGame(id: string) { // DELETA O JOGO SALVO
    this.RunningGames.delete(id)
  }
  static PlayersOn() { // RETORNA O NUMERO DE JOGADORES
    return this.PlayersInGames.size
  }
  static OnHitEvent(event: EntityHitEntityAfterEvent) {
    if (event.hitEntity.typeId !== 'minecraft:player' || event.damagingEntity.typeId !== 'minecraft:player') return
    console.log('[BombaPartyManager]: on hit event');

    const attacker = event.damagingEntity as Player
    const victim = event.hitEntity as Player
    const game = this.GetPlayerGame(attacker.id)

    if (!game || game !== this.GetPlayerGame(victim.id)) return // INTERROMPE SE NÃO ESTIFEREM JOGANDO NO MESMO JOGO
    game.onHit(attacker, victim)
  }
  static OnItemUse(event: ItemUseAfterEvent) {
    const game = this.GetPlayerGame(event.source.id)
    if (!game) return // INTERROMPE SE NÃO ESTIVER EM UM JOGO
    const itemList = GERAL_CONF.games.bomb_party.items
    if (event.itemStack.typeId === itemList.exit_item_type) {
      game.leave(event.source.id)
    }
  }
  static OnLeave(event: PlayerLeaveAfterEvent) {
    const game = this.PlayersInGames.get(event.playerId)
    if (!game) return
    game.leave(event.playerId)
  }
}
