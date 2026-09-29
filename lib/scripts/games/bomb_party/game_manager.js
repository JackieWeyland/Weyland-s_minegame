import { EntityComponentTypes, ItemLockMode, ItemStack, system } from "@minecraft/server";
import { GERAL_CONF } from "../../config";
import { randomBetween, TimerCouter } from "../../utils";
export class BombPatyGame {
    players = new Set(); // LISTA DE JOGADORES
    gameId;
    bombMan = null; // PLAYER COM A BOMBA
    roundRunning = false; // VERIFICA SE A RODADA ESTÁ ACONTECENDO
    gameStarted = false; // VERIFICA SE O JOGO INICIOU PELA PRIMEIRA VEZ
    constructor(gameId) {
        this.gameId = gameId;
        BombPartyManager.AddGame(gameId, this);
        console.log('[BombaPartyGame]: New game stance');
    }
    start() {
        console.log('[BombaPartyGame]: Starting...');
        if (this.gameStarted)
            return; // VERIFICA SE O JOGO COMEÇOU
        const gameConf = GERAL_CONF.games.bomb_party;
        if (this.players.size < gameConf.min_players)
            return; // INTERROMPE SE NÃO HAVER JOGADORES O SUFICIENTE
        this.gameStarted = true; // DEFINE COMO JOGO INICIADO
        this.startRound(); // INICIA UMA RODADA
        console.log('[BombaPartyGame]: Game started!');
    }
    startRound() {
        console.log('[BombaPartyGame]: Starting Round...');
        const gameConf = GERAL_CONF.games.bomb_party;
        const initialTimer = (time) => {
            console.log('[BombaPartyGame]: Start in', time);
        };
        const bombTimer = (time) => {
            console.log('[BombaPartyGame]: Detone in', time);
        };
        const onStartRound = () => {
            const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
            this.bombMan = bombMan; // SETAR O HOMEM BOMBA ALEATORIO
            this.roundRunning = true; // DEFINE COMO PARTIDA INICIALIZADA
            console.log('[BombaPartyGame]:', bombMan.name, 'are Bomb Man!');
            TimerCouter.Inverse(gameConf.game_duration, bombTimer, onDetoneBomb);
            console.log('[BombaPartyGame]: Round started!');
        };
        const onDetoneBomb = () => {
            console.log('[BombaPartyGame]: Bomb detoned!');
            if (this.bombMan) {
                console.log('[BombaPartyGame]:', this.bombMan.name, 'died!');
            }
            this.endRound(); // FINALIZA A PARTIDA
        };
        TimerCouter.Cummon(5, initialTimer, onStartRound);
    }
    end() {
        // const gameConf = GERAL_CONF.games.bomb_party
        console.log('[BombaPartyGame]: ending Game...');
        this.players.forEach(player => {
            BombPartyManager.RemovePlayer(player);
            player.teleport(GERAL_CONF.locations.lobby);
        });
        this.players.clear();
        BombPartyManager.RemoveGame(this.gameId);
        console.log('[BombaPartyGame]: Game Kill!');
    }
    endRound() {
        console.log('[BombaPartyGame]: ending Round...');
        const gameConf = GERAL_CONF.games.bomb_party;
        this.bombMan = null;
        this.roundRunning = false;
        system.runTimeout(() => {
            if (this.players.size >= gameConf.min_players) { // VERIFICA SE HÁ UM MINIMO DE JOGADORES
                this.startRound(); // INICIA UMA NOVA PARTIDA
            }
            else {
                this.end();
            } // FINALIZA O JOGO
        }, 60);
    }
    join(player) {
        console.log('[BombaPartyGame]: Joining...');
        if (this.players.has(player))
            return; // IMPEDE QUE O JOGADOR ENTRE DUAS VEZES
        const gameConf = GERAL_CONF.games.bomb_party;
        if (this.players.size >= gameConf.max_players)
            return; // IMPEDE SE O JOGO ESTIVER LOTADO
        this.players.add(player); // SALVA ESSE JOGADOR
        BombPartyManager.AddPlayer(player, this); // REGISTARA O JOGADOR A ESSE JOGO
        const pos = gameConf.maps[this.gameId].spawn_area;
        player.teleport({
            x: randomBetween(pos.start.x, pos.end.x),
            y: randomBetween(pos.start.y, pos.end.y),
            z: randomBetween(pos.start.z, pos.end.z)
        });
        const container = player.getComponent(EntityComponentTypes.Inventory).container;
        container.clearAll(); // LIMPA O IVENTARIO DO JOGADOR
        const exitItem = new ItemStack(gameConf.items.exit_item_type); // ITEM PRA SAIR DO JOGO
        exitItem.lockMode = ItemLockMode.slot; // TRAVA O ITEM NO SLOT
        container.setItem(8, exitItem);
        console.log('[BombaPartyGame]:', player.name, 'joinned!');
    }
    onHit(attacker, victim) {
        console.log('[BombaPartyGame]: on Hit');
        if (attacker.id !== this.bombMan?.id)
            return; // INTERROMPE SE NÃO FOR O HOMEM BOMBA
        this.bombMan = victim; // TRANSFERE A BOMBA
        console.log('[BombaPartyGame]:', victim.name, 'are Bomb Man!');
    }
    exit(player) {
        console.log('[BombaPartyGame]: exiting...');
        if (!this.players.has(player))
            return; // INTERROMPE SE O JOGADOR NÃO ESTIVER NO JOGO
        if (player.id === this.bombMan?.id) { // VERIFICA SE O HOMEM BOMBA SAIU
            if (this.roundRunning) { // VERIFICA SE O JOGO TÁ ACONTECENDO
                const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
                this.bombMan = bombMan; // DA A BOMBA A OUTRO JOGADOR
                console.log('[BombaPartyGame]:', bombMan.name, 'are Bomb Man');
            }
            else {
                this.bombMan = null;
            }
        }
        this.players.delete(player); // DELETA O JOGADOR DA PARTIDA
        BombPartyManager.RemovePlayer(player);
        const container = player.getComponent(EntityComponentTypes.Inventory).container;
        container.clearAll(); // LIMPA O IVENTARIO DO JOGADOR
        console.log('[BombaPartyGame]:', player.name, 'exit!');
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
    static GetPlayerGame(player) {
        return this.PlayersInGames.get(player.id);
    }
    static AddPlayer(player, game) {
        if (this.PlayersInGames.has(player.id))
            return;
        this.PlayersInGames.set(player.id, game);
    }
    static RemovePlayer(player) {
        this.PlayersInGames.delete(player.id);
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
        const game = this.GetPlayerGame(attacker);
        if (!game || game !== this.GetPlayerGame(victim))
            return; // INTERROMPE SE NÃO ESTIFEREM JOGANDO NO MESMO JOGO
        game.onHit(attacker, victim);
    }
    static OnItemUse(event) {
        console.log('[BombaPartyManager]: on item use');
        const game = this.GetPlayerGame(event.source);
        if (!game)
            return; // INTERROMPE SE NÃO ESTIVER EM UM JOGO
        const itemList = GERAL_CONF.games.bomb_party.items;
        if (event.itemStack.typeId === itemList.exit_item_type) {
            game.exit(event.source);
        }
    }
}
//# sourceMappingURL=game_manager.js.map