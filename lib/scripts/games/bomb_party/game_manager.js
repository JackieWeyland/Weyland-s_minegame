import { EntityComponentTypes, EquipmentSlot, GameMode, ItemLockMode, ItemStack, system } from "@minecraft/server";
import { GERAL_CONF } from "../../config";
import { randomBetween, TimerManager } from "../../utils";
import { SpecialEntity } from "../../features/special_entities_system";
var GameState;
(function (GameState) {
    GameState[GameState["Waiting"] = 0] = "Waiting";
    GameState[GameState["Starting"] = 1] = "Starting";
    GameState[GameState["Running"] = 2] = "Running";
    GameState[GameState["BetweenRounds"] = 3] = "BetweenRounds";
    GameState[GameState["Finished"] = 4] = "Finished"; // FIM DE JOGO
})(GameState || (GameState = {}));
function screenDetoneTimer(player, time) {
    const text = [`§l§f> §f${time} §f<`, `§l §f>§c${time}§f< `][time % 2]; // ALTERNAR COR
    player.onScreenDisplay.setActionBar(text);
    player.playSound('random.click');
}
function screenStartTimer(player, time) {
    const text = [`§l§f> §a${time} §f<`, `§l §f>§a${time}§f< `][time % 2];
    player.onScreenDisplay.setActionBar(text);
    time === 0 ? player.playSound('note.bell') : player.playSound('note.bass');
}
function bombManDetoned(players, bombMan) {
    bombMan.onScreenDisplay.setTitle('§l§fVocê §cexplodiu§f!');
    bombMan.dimension.spawnParticle("minecraft:huge_explosion_emitter", bombMan.location);
    bombMan.applyKnockback({ x: 0, z: 0 }, 1.3);
    bombMan.playAnimation('animation.bomb_man.detoned');
    players.forEach(player => {
        player.sendMessage(`§c${bombMan.name} §fexplodiu!`);
        player.playSound('random.explode');
    });
    const container = bombMan.getComponent(EntityComponentTypes.Inventory).container;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type)
            continue;
        container.setItem(i, undefined);
    }
}
function onTransferBomb(players, bombMan, oldBombMan) {
    const gameConf = GERAL_CONF.games.bomb_party;
    if (oldBombMan && oldBombMan.isValid) { // LIMPAR O IVENTARIO DO JOGADOR
        console.log('limpar o inventarido de', oldBombMan.name);
        const container = oldBombMan.getComponent(EntityComponentTypes.Inventory).container;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item?.typeId !== gameConf.items.bomb_item_type)
                continue;
            container.setItem(i, undefined);
        }
    }
    console.log('adicionar a bomba a', bombMan.name);
    const container = bombMan.getComponent(EntityComponentTypes.Inventory).container;
    const bombItem = new ItemStack(gameConf.items.bomb_item_type);
    bombItem.lockMode = ItemLockMode.slot;
    container.setItem(0, bombItem);
    bombMan.onScreenDisplay.setTitle("§l§fVocê está com a §cBOMBA§f!");
    players.forEach(player => {
        player.sendMessage(`§f${bombMan.name} está com a §cBOMBA§f!`);
        player.playSound("block.bell.hit");
    });
}
function onExitPlayer(player) {
    player.teleport(GERAL_CONF.locations.lobby); // RETORNA PARA O LOBBY
    player.stopMusic();
    player.getEffects().forEach(e => player.removeEffect(e.typeId));
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll(); // LIMPA O IVENTARIO DO JOGADOR
}
function onPlayerJoin(player, pos) {
    player.setGameMode(GameMode.Adventure);
    player.runCommand('effect @s resistance infinite 255 true');
    player.runCommand('effect @s saturation infinite 255 true');
    player.getEffects().forEach(e => console.log(e.duration));
    player.teleport({
        x: randomBetween(pos.start.x, pos.end.x),
        y: randomBetween(pos.start.y, pos.end.y),
        z: randomBetween(pos.start.z, pos.end.z)
    });
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll(); // LIMPA O IVENTARIO DO JOGADOR
    const exitItem = new ItemStack(GERAL_CONF.games.bomb_party.items.exit_item_type); // ITEM PRA SAIR DO JOGO
    exitItem.lockMode = ItemLockMode.slot; // TRAVA O ITEM NO SLOT
    container.setItem(8, exitItem);
}
class MusicManager {
    static lastTrackers = new Map();
    static playRandomMusic(players, mapId) {
        const musics = GERAL_CONF.games.bomb_party.sounds.musics;
        const tracker = this.lastTrackers.get(mapId);
        let index = 0;
        do {
            index = Math.floor(Math.random() * musics.length);
        } while (index === tracker);
        const music = musics[index];
        players.forEach(player => {
            console.log(music);
            player.stopMusic();
            system.run(() => player.playMusic(music));
        });
        this.lastTrackers.set(mapId, index);
    }
    static stopSound(players) {
        players.forEach(player => player.stopMusic());
    }
}
export class BombPatyGame {
    players = new Set(); // LISTA DE JOGADORES
    gameId;
    bombMan = null; // PLAYER COM A BOMBA
    state = GameState.Waiting;
    constructor(gameId) {
        this.gameId = gameId;
        BombPartyManager.AddGame(gameId, this);
        console.log('[BombaPartyGame]: New game stance');
    }
    start() {
        console.log('[BombaPartyGame]: Starting...');
        // if (this.gameStarted) return // VERIFICA SE O JOGO COMEÇOU
        if (this.state !== GameState.Waiting)
            return; // VERIFICA SE O JOGO ESTÁ ESPERANDO 
        const gameConf = GERAL_CONF.games.bomb_party;
        if (this.players.size < gameConf.min_players)
            return; // INTERROMPE SE NÃO HAVER JOGADORES O SUFICIENTE
        // this.gameStarted = true // DEFINE COMO JOGO INICIADO
        this.state = GameState.Starting; // DEFINE COMO INICIANDO
        this.startRound(); // INICIA UMA RODADA
        console.log('[BombaPartyGame]: Game started!');
    }
    startRound() {
        console.log('[BombaPartyGame]: Starting Round...');
        if (this.state !== GameState.Starting && this.state !== GameState.BetweenRounds)
            return;
        this.state = GameState.Starting;
        const gameConf = GERAL_CONF.games.bomb_party;
        const initialTimer = ({ cancelTimer, currentTime }) => {
            if (this.state === GameState.Finished)
                return cancelTimer();
            this.players.forEach(player => screenStartTimer(player, (5 - currentTime)));
        };
        const bombTimer = ({ cancelTimer, currentTime }) => {
            if (this.state === GameState.Finished)
                return cancelTimer();
            this.players.forEach(player => screenDetoneTimer(player, (gameConf.game_duration - currentTime)));
        };
        const onStartRound = () => {
            if (this.state !== GameState.Starting)
                return;
            if (this.players.size < GERAL_CONF.games.bomb_party.min_players)
                return this.end();
            const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
            this.bombMan = bombMan; // SETAR O HOMEM BOMBA ALEATORIO
            this.state = GameState.Running; // DEFINE COMO PARTIDA INICIALIZADA
            onTransferBomb([...this.players], bombMan);
            // TimerCouter.Inverse(gameConf.game_duration, bombTimer, onDetoneBomb)
            TimerManager.SetTimer(gameConf.game_duration, bombTimer, onDetoneBomb);
            SpecialEntity.SetEntities(gameConf.power_ups);
            console.log('[BombaPartyGame]: Round started!');
            MusicManager.playRandomMusic([...this.players], this.gameId);
        };
        const onDetoneBomb = () => {
            if (this.state !== GameState.Running)
                return;
            console.log('[BombaPartyGame]: Bomb detoned!');
            if (this.bombMan) {
                console.log('[BombaPartyGame]:', this.bombMan.name, 'died!');
                bombManDetoned([...this.players], this.bombMan);
            }
            this.endRound(); // FINALIZA A PARTIDA
            MusicManager.stopSound([...this.players]);
        };
        TimerManager.SetTimer(5, initialTimer, onStartRound);
    }
    end() {
        console.log('[BombaPartyGame]: ending Game...');
        this.players.forEach(player => {
            BombPartyManager.RemovePlayer(player.id);
            if (player.isValid)
                onExitPlayer(player);
        });
        this.players.clear();
        this.state = GameState.Finished;
        BombPartyManager.RemoveGame(this.gameId);
        console.log('[BombaPartyGame]: Game Kill!');
    }
    endRound() {
        console.log('[BombaPartyGame]: ending Round...');
        const gameConf = GERAL_CONF.games.bomb_party;
        this.bombMan = null;
        this.state = GameState.BetweenRounds;
        system.runTimeout(() => {
            if (this.state !== GameState.BetweenRounds)
                return;
            if (this.players.size >= gameConf.min_players) { // VERIFICA SE HÁ UM MINIMO DE JOGADORES
                this.startRound(); // INICIA UMA NOVA PARTIDA
            }
            else {
                this.end();
            } // FINALIZA O JOGO
        }, 60);
    }
    join(player) {
        if (this.state === GameState.Finished)
            return;
        if (BombPartyManager.GetPlayerGame(player.id))
            return;
        if (this.players.has(player))
            return; // IMPEDE QUE O JOGADOR ENTRE DUAS VEZES
        const gameConf = GERAL_CONF.games.bomb_party;
        if (this.players.size >= gameConf.max_players)
            return; // IMPEDE SE O JOGO ESTIVER LOTADO
        this.players.add(player); // SALVA ESSE JOGADOR
        BombPartyManager.AddPlayer(player.id, this); // REGISTARA O JOGADOR A ESSE JOGO
        const pos = gameConf.maps[this.gameId].spawn_area;
        onPlayerJoin(player, pos);
    }
    onHit(attacker, victim) {
        if (this.state !== GameState.Running)
            return;
        console.log('[BombaPartyGame]: on Hit');
        if (attacker.id !== this.bombMan?.id)
            return; // INTERROMPE SE NÃO FOR O HOMEM BOMBA
        const item = attacker.getComponent(EntityComponentTypes.Equippable).getEquipmentSlot(EquipmentSlot.Mainhand).getItem();
        if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type)
            return;
        this.bombMan = victim; // TRANSFERE A BOMBA
        onTransferBomb([...this.players], victim, attacker);
    }
    leave(playerId) {
        const player = [...this.players].find(p => p.id === playerId);
        BombPartyManager.RemovePlayer(playerId);
        if (player) {
            this.players.delete(player);
            if (player.isValid)
                onExitPlayer(player);
        }
        if (this.players.size === 0)
            return this.end();
        if (playerId !== this.bombMan?.id)
            return;
        this.bombMan = null;
        if (this.state !== GameState.Running)
            return;
        const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
        if (bombMan) {
            this.bombMan = bombMan;
            onTransferBomb([...this.players], bombMan);
        }
    }
}
export class BombPartyManager {
    static RunningGames = new Map(); // PARDITAS ACONTECENDO
    static PlayersInGames = new Map(); // LISTA DE JOGADORES EM PARTIDAS
    static AddGame(id, game) {
        this.RunningGames.set(id, game);
    }
    static GetGame(id) {
        return this.RunningGames.get(id);
    }
    static GetGameList() {
        return [...this.RunningGames.keys()];
    }
    static GetPlayerGame(playerId) {
        return this.PlayersInGames.get(playerId);
    }
    static AddPlayer(playerId, game) {
        if (this.PlayersInGames.has(playerId))
            return;
        this.PlayersInGames.set(playerId, game);
    }
    static RemovePlayer(playerId) {
        this.PlayersInGames.delete(playerId);
    }
    static RemoveGame(id) {
        this.RunningGames.delete(id);
    }
    static PlayersOn() {
        return this.PlayersInGames.size;
    }
    static OnHitEvent(event) {
        if (event.hitEntity.typeId !== 'minecraft:player' || event.damagingEntity.typeId !== 'minecraft:player')
            return;
        console.log('[BombaPartyManager]: on hit event');
        const attacker = event.damagingEntity;
        const victim = event.hitEntity;
        const game = this.GetPlayerGame(attacker.id);
        if (!game || game !== this.GetPlayerGame(victim.id))
            return; // INTERROMPE SE NÃO ESTIFEREM JOGANDO NO MESMO JOGO
        game.onHit(attacker, victim);
    }
    static OnItemUse(event) {
        const game = this.GetPlayerGame(event.source.id);
        if (!game)
            return; // INTERROMPE SE NÃO ESTIVER EM UM JOGO
        const itemList = GERAL_CONF.games.bomb_party.items;
        if (event.itemStack.typeId === itemList.exit_item_type) {
            game.leave(event.source.id);
        }
    }
    static OnLeave(event) {
        const game = this.PlayersInGames.get(event.playerId);
        if (!game)
            return;
        game.leave(event.playerId);
    }
}
//# sourceMappingURL=game_manager.js.map