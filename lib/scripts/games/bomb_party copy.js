import { EntityComponentTypes, system, world } from "@minecraft/server";
import { GERAL_CONF } from "../config";
import { TimerCouter } from "../utils";
const GAME_CONF = GERAL_CONF.games.bomb_party;
const PLAYERS_IN_GAME = new Set();
let BOMB_MAN = null;
function onHit(event) {
    const attacker = event.damagingEntity;
    const victim = event.hitEntity;
    if (!BOMB_MAN)
        return;
    if (victim.typeId !== 'minecraft:player' || attacker.typeId !== 'minecraft:player')
        return;
    if (BOMB_MAN.id !== attacker.id)
        return;
    BOMB_MAN = victim; // passa a posse
    victim.onScreenDisplay.setTitle('A bomba está com voce!');
    PLAYERS_IN_GAME.forEach(player => player.sendMessage(`a bomba está com ${victim.name}`));
}
function finishGame() {
    // RESTART GAME
    console.log(BOMB_MAN.name, "explodiu!");
    system.runTimeout(function () {
        if (PLAYERS_IN_GAME.size >= GAME_CONF.min_players)
            return startGame();
        BOMB_MAN = null;
        PLAYERS_IN_GAME.forEach(player => {
            PLAYERS_IN_GAME.delete(player);
            player.teleport({ x: 0, y: 95, z: 0 });
        });
    }, 60);
}
function startGame() {
    const playerList = [...PLAYERS_IN_GAME];
    BOMB_MAN = playerList[Math.floor(Math.random() * PLAYERS_IN_GAME.size)];
    BOMB_MAN.onScreenDisplay.setTitle("Você está com a BOMBA!");
    playerList.forEach(player => {
        player.sendMessage(`${BOMB_MAN.name} é o homem bomba!!`);
    });
    world.afterEvents.entityHitEntity.subscribe(onHit);
    TimerCouter.Inverse(GAME_CONF.game_duration, function (time) {
        const randomColor = ['§f', '§c'][time % 2];
        const canSound = time <= 5;
        PLAYERS_IN_GAME.forEach(player => {
            player.onScreenDisplay.setActionBar(`${randomColor}${time}`);
            if (canSound)
                player.playSound('random.click');
        });
    }, finishGame);
}
function onJoinInGame(player) {
    if (PLAYERS_IN_GAME.has(player))
        return console.log('Já entrou no jogo');
    if (PLAYERS_IN_GAME.size >= GAME_CONF.max_players)
        return console.log('limite de jogadores');
    PLAYERS_IN_GAME.add(player);
    // TELEPORTAR O JOGADOR
    const start = GAME_CONF.spawn_area.start;
    const end = GAME_CONF.spawn_area.end;
    const randomBetween = (a, b) => {
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    player.teleport({
        x: randomBetween(start.x, end.x),
        y: randomBetween(start.y, end.y),
        z: randomBetween(start.z, end.z)
    });
    // REMOVER ITEMS
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll();
    if (PLAYERS_IN_GAME.size < GAME_CONF.min_players)
        return;
    TimerCouter.Cummon(5, (time) => {
        PLAYERS_IN_GAME.forEach(player => {
            player.onScreenDisplay.setTitle(`${time}`);
            player.playSound('random.click');
        });
    }, startGame);
}
export class BombPatyGame {
    static OnJoin = onJoinInGame;
}
//# sourceMappingURL=bomb_party%20copy.js.map