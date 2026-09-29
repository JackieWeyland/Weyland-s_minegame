// scripts/games/bomb_party/game_manager.ts
import { EntityComponentTypes, ItemLockMode, ItemStack, system as system2 } from "@minecraft/server";

// scripts/config.ts
var GERAL_CONF = {
  "npc_of_game": {
    "minecraft:armor_stand": "bomb_party"
  },
  "locations": {
    "lobby": { x: 0, y: 95, z: 0 }
  },
  "games": {
    "bomb_party": {
      "min_players": 2,
      "max_players": 10,
      "game_duration": 10,
      "items": {
        "exit_item_type": "minecraft:stick"
      },
      "maps": {
        "Arena_1": {
          "spawn_area": {
            "start": { x: 20, y: 92, z: 20 },
            "end": { x: -20, y: 92, z: -20 }
          }
        }
      }
    }
  }
};

// scripts/utils/timer_counters.ts
import { system } from "@minecraft/server";
function timerCounterCummon(time, onChange, onFinish) {
  let currentTime = 0;
  const counter = () => {
    if (currentTime >= time) return onFinish();
    currentTime++;
    onChange(currentTime);
    system.runTimeout(counter, 20);
  };
  counter();
}
function timerCounterInverse(time, onChange, onFinish) {
  let currentTime = time;
  const counter = () => {
    if (currentTime <= 0) return onFinish();
    onChange(currentTime);
    currentTime--;
    system.runTimeout(counter, 20);
  };
  counter();
}
var TimerCouter = class {
  static Cummon = timerCounterCummon;
  static Inverse = timerCounterInverse;
};

// scripts/utils/number_managers.ts
function randomBetween(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// scripts/games/bomb_party/game_manager.ts
var BombPatyGame = class {
  // CRIADOR DE INSTANCIAS DE PARTIDAS
  players = /* @__PURE__ */ new Set();
  // LISTA DE JOGADORES
  gameId;
  bombMan = null;
  // PLAYER COM A BOMBA
  roundRunning = false;
  // VERIFICA SE A RODADA ESTÁ ACONTECENDO
  gameStarted = false;
  // VERIFICA SE O JOGO INICIOU PELA PRIMEIRA VEZ
  constructor(gameId) {
    this.gameId = gameId;
    BombPartyManager.AddGame(gameId, this);
    console.log("[BombaPartyGame]: New game stance");
  }
  start() {
    console.log("[BombaPartyGame]: Starting...");
    if (this.gameStarted) return;
    const gameConf = GERAL_CONF.games.bomb_party;
    if (this.players.size < gameConf.min_players) return;
    this.gameStarted = true;
    this.startRound();
    console.log("[BombaPartyGame]: Game started!");
  }
  startRound() {
    console.log("[BombaPartyGame]: Starting Round...");
    const gameConf = GERAL_CONF.games.bomb_party;
    const initialTimer = (time) => {
      console.log("[BombaPartyGame]: Start in", time);
    };
    const bombTimer = (time) => {
      console.log("[BombaPartyGame]: Detone in", time);
    };
    const onStartRound = () => {
      const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
      this.bombMan = bombMan;
      this.roundRunning = true;
      console.log("[BombaPartyGame]:", bombMan.name, "are Bomb Man!");
      TimerCouter.Inverse(gameConf.game_duration, bombTimer, onDetoneBomb);
      console.log("[BombaPartyGame]: Round started!");
    };
    const onDetoneBomb = () => {
      console.log("[BombaPartyGame]: Bomb detoned!");
      if (this.bombMan) {
        console.log("[BombaPartyGame]:", this.bombMan.name, "died!");
      }
      this.endRound();
    };
    TimerCouter.Cummon(5, initialTimer, onStartRound);
  }
  end() {
    console.log("[BombaPartyGame]: ending Game...");
    this.players.forEach((player) => {
      BombPartyManager.RemovePlayer(player);
      player.teleport(GERAL_CONF.locations.lobby);
    });
    this.players.clear();
    BombPartyManager.RemoveGame(this.gameId);
    console.log("[BombaPartyGame]: Game Kill!");
  }
  endRound() {
    console.log("[BombaPartyGame]: ending Round...");
    const gameConf = GERAL_CONF.games.bomb_party;
    this.bombMan = null;
    this.roundRunning = false;
    system2.runTimeout(() => {
      if (this.players.size >= gameConf.min_players) {
        this.startRound();
      } else {
        this.end();
      }
    }, 60);
  }
  join(player) {
    console.log("[BombaPartyGame]: Joining...");
    if (this.players.has(player)) return;
    const gameConf = GERAL_CONF.games.bomb_party;
    if (this.players.size >= gameConf.max_players) return;
    this.players.add(player);
    BombPartyManager.AddPlayer(player, this);
    const pos = gameConf.maps[this.gameId].spawn_area;
    player.teleport({
      x: randomBetween(pos.start.x, pos.end.x),
      y: randomBetween(pos.start.y, pos.end.y),
      z: randomBetween(pos.start.z, pos.end.z)
    });
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll();
    const exitItem = new ItemStack(gameConf.items.exit_item_type);
    exitItem.lockMode = ItemLockMode.slot;
    container.setItem(8, exitItem);
    console.log("[BombaPartyGame]:", player.name, "joinned!");
  }
  onHit(attacker, victim) {
    console.log("[BombaPartyGame]: on Hit");
    if (attacker.id !== this.bombMan?.id) return;
    this.bombMan = victim;
    console.log("[BombaPartyGame]:", victim.name, "are Bomb Man!");
  }
  exit(player) {
    console.log("[BombaPartyGame]: exiting...");
    if (!this.players.has(player)) return;
    if (player.id === this.bombMan?.id) {
      if (this.roundRunning) {
        const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
        this.bombMan = bombMan;
        console.log("[BombaPartyGame]:", bombMan.name, "are Bomb Man");
      } else {
        this.bombMan = null;
      }
    }
    this.players.delete(player);
    BombPartyManager.RemovePlayer(player);
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    container.clearAll();
    console.log("[BombaPartyGame]:", player.name, "exit!");
  }
};
var BombPartyManager = class {
  // GERENCIADOR DE PARTIDAS
  static RunningGames = /* @__PURE__ */ new Map();
  // PARDITAS ACONTECENDO
  static PlayersInGames = /* @__PURE__ */ new Map();
  // LISTA DE JOGADORES EM PARTIDAS
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
    if (this.PlayersInGames.has(player.id)) return;
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
    if (event.hitEntity.typeId !== "minecraft:player" || event.damagingEntity.typeId !== "minecraft:player") return;
    console.log("[BombaPartyManager]: on hit event");
    const attacker = event.damagingEntity;
    const victim = event.hitEntity;
    const game = this.GetPlayerGame(attacker);
    if (!game || game !== this.GetPlayerGame(victim)) return;
    game.onHit(attacker, victim);
  }
  static OnItemUse(event) {
    console.log("[BombaPartyManager]: on item use");
    const game = this.GetPlayerGame(event.source);
    if (!game) return;
    const itemList = GERAL_CONF.games.bomb_party.items;
    if (event.itemStack.typeId === itemList.exit_item_type) {
      game.exit(event.source);
    }
  }
};

// scripts/games/bomb_party/interfaces_manager.ts
import { ActionFormData } from "@minecraft/server-ui";
function bombPartyInterface(player) {
  const actionForm = new ActionFormData();
  actionForm.title("\xA7lBOMB PARTY");
  const playersOn = BombPartyManager.PlayersOn();
  actionForm.body(`Jogadores online: ${playersOn}`);
  actionForm.button("\xA7l\xA7aEntrar");
  actionForm.button("\xA7l\xA7eCriar");
  actionForm.show(player).then(function(result) {
    if (result.canceled) return;
    const actionList = [gameRunningInterface, createGameInterface];
    const action = actionList[result.selection];
    action(player);
  });
}
function createGameInterface(player) {
  const actionForm = new ActionFormData();
  actionForm.title("\xA7lBOMB PARTY");
  const gamesRunning = BombPartyManager.GetGameList();
  const mapList = Object.keys(GERAL_CONF.games.bomb_party.maps).filter((g) => !gamesRunning.includes(g));
  mapList.forEach((key) => actionForm.button(key));
  actionForm.show(player).then(function(result) {
    if (result.canceled) return;
    const gameId = mapList[result.selection];
    if (BombPartyManager.GetGameList().includes(gameId)) return;
    const game = new BombPatyGame(gameId);
    game.join(player);
    game.start();
  });
}
function gameRunningInterface(player) {
  const actionForm = new ActionFormData();
  actionForm.title("\xA7lBOMB PARTY");
  const gamesRunning = BombPartyManager.GetGameList();
  gamesRunning.forEach((id) => actionForm.button(id));
  actionForm.show(player).then(function(result) {
    if (result.canceled) return;
    const game = BombPartyManager.GetGame(gamesRunning[result.selection]);
    game.join(player);
    game.start();
  });
}

// scripts/lobby/npcs_interaction.ts
import { world } from "@minecraft/server";
world.afterEvents.playerInteractWithEntity.subscribe(function(event) {
  console.log("pass", event.target.typeId);
  const gameId = GERAL_CONF.npc_of_game[event.target.typeId];
  const joinInGame = {
    "bomb_party": bombPartyInterface
  };
  joinInGame[gameId]?.(event.player);
});

// scripts/event_routers.ts
import { world as world2 } from "@minecraft/server";
world2.afterEvents.entityHitEntity.subscribe(function(event) {
  console.log("[event_routers]: entity hit entity");
  BombPartyManager.OnHitEvent(event);
});
world2.afterEvents.itemUse.subscribe(function(event) {
  console.log("[event_routers]: item use");
  BombPartyManager.OnItemUse(event);
});

//# sourceMappingURL=../debug/main.js.map
