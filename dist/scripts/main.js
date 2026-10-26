// scripts/games/bomb_party/game_manager.ts
import { EntityComponentTypes, EquipmentSlot, GameMode, ItemLockMode, ItemStack, system as system2 } from "@minecraft/server";

// scripts/config.ts
var GERAL_CONF = {
  "npc_of_game": {
    "wgames:bomb_party_npc": "bomb_party"
  },
  "locations": {
    "lobby": { x: 2, y: 1, z: 3 }
    // 2 1 3
  },
  "power_up_types": {
    "wgames:speed_power_up": {
      "effect": "speed",
      "power": 2,
      "duration": 100
      // ticks
    }
  },
  "pressure_plates": {
    "-25 22 1025": {
      "action": "super_jump",
      "vertical_power": 2,
      "horizontal_power": 15
    }
  },
  "games": {
    "bomb_party": {
      "min_players": 1,
      "max_players": 10,
      "game_duration": 60,
      "power_ups": {
        "wgames:speed_power_up": {
          "locations": [
            { x: 7, y: 5, z: 1e3 },
            { x: -23, y: 10, z: 979 },
            { x: 17, y: 2, z: 965 },
            { x: 49, y: 11, z: 1046 },
            { x: -37, y: 0, z: 943 }
          ]
        }
      },
      "items": {
        "exit_item_type": "wgames:exit_game",
        "bomb_item_type": "wgames:bomb_item"
      },
      "sounds": {
        "musics": [
          "bomba_party.music.01",
          "bomba_party.music.02",
          "bomba_party.music.03",
          "bomba_party.music.04"
        ]
      },
      "maps": {
        "Arena_1": {
          "spawn_area": {
            "start": { x: -28, y: 0, z: 1008 },
            // -28 0 1008
            "end": { x: -6, y: 0, z: 986 }
            // -6 0 986
          }
        }
      }
    }
  }
};

// scripts/utils/timer_counters.ts
import { system } from "@minecraft/server";
var TimerManager = class {
  // GERENCIADOR DE TEMPORIZADORES
  constructor() {
  }
  static SetTimer(time, onTick, end) {
    let currentTime = 0;
    let canceled = false;
    const cancelTimer = () => canceled = true;
    const timer = () => {
      if (canceled) return;
      if (currentTime >= time) return end();
      currentTime++;
      onTick({ cancelTimer, currentTime });
      if (!canceled) system.runTimeout(timer, 20);
    };
    timer();
  }
};

// scripts/utils/number_managers.ts
function randomBetween(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// scripts/features/special_entities_system.ts
import { world } from "@minecraft/server";
var SpecialEntitiesDefinitions = class {
  static "wgames:speed_power_up" = function(player, entity) {
    const effecType = "speed", amplifier = 2, duration = 160;
    player.addEffect(effecType, duration, { amplifier });
    entity.remove();
  };
  static "wgames:coin_drop" = function(player, entity) {
    player.playSound("random.orb");
    player.playSound("random.pop");
    entity.remove();
  };
};
var SpecialEntity = class {
  static SetEntities(definitions) {
    const dimension = world.getDimension("overworld");
    Object.keys(definitions).forEach((type) => {
      const locations = definitions[type].locations;
      for (const location of locations) {
        const entities = dimension.getEntities({ type, location, maxDistance: 2 });
        if (entities.length > 0) continue;
        dimension.spawnEntity(type, location);
      }
    });
  }
  static setEntitiesBetweenLocations(definitions) {
    const dimension = world.getDimension("overworld");
    for (const type in definitions) {
      const locationA = definitions[type].pos1;
      const locationB = definitions[type].pos2;
      let maxEntities = definitions[type].maxEntities;
      while (maxEntities > 0) {
        maxEntities--;
        const location = {
          x: randomBetween(locationA.x, locationB.x),
          y: randomBetween(locationA.y, locationB.y),
          z: randomBetween(locationA.z, locationB.z)
        };
        const maxDistance = definitions[type].entityArroundDistance;
        const maxEntitiesArround = definitions[type].maxEntitiesArround;
        const entitiesArround = dimension.getEntities({ type, location, maxDistance }).length;
        if (entitiesArround < maxEntitiesArround) {
          dimension.spawnEntity(type, location);
        }
      }
    }
  }
  static ProximitScan() {
    const players = world.getAllPlayers();
    for (const player of players) {
      const location = player.location, maxDistance = 1, excludeFamilies = ["player"];
      const entities = player.dimension.getEntities({ location, maxDistance, excludeFamilies });
      if (entities.length === 0) continue;
      for (const entity of entities) {
        const action = SpecialEntitiesDefinitions[entity.typeId];
        if (typeof action !== "function") continue;
        action(player, entity);
      }
    }
  }
  static OnHit(event) {
    if (event.damagingEntity.typeId !== "minecraft:player") return;
    const action = SpecialEntitiesDefinitions[event.hitEntity.typeId];
    if (typeof action === "function") action(event.damagingEntity, event.hitEntity);
  }
};

// scripts/games/bomb_party/game_manager.ts
function screenDetoneTimer(player, time) {
  const text = [`\xA7l\xA7f> \xA7f${time} \xA7f<`, `\xA7l \xA7f>\xA7c${time}\xA7f< `][time % 2];
  player.onScreenDisplay.setActionBar(text);
  player.playSound("random.click");
}
function screenStartTimer(player, time) {
  const text = [`\xA7l\xA7f> \xA7a${time} \xA7f<`, `\xA7l \xA7f>\xA7a${time}\xA7f< `][time % 2];
  player.onScreenDisplay.setActionBar(text);
  time === 0 ? player.playSound("note.bell") : player.playSound("note.bass");
}
function bombManDetoned(players, bombMan) {
  bombMan.onScreenDisplay.setTitle("\xA7l\xA7fVoc\xEA \xA7cexplodiu\xA7f!");
  bombMan.dimension.spawnParticle(
    "minecraft:huge_explosion_emitter",
    bombMan.location
  );
  bombMan.applyKnockback({ x: 0, z: 0 }, 1.3);
  bombMan.playAnimation("animation.bomb_man.detoned");
  players.forEach((player) => {
    player.sendMessage(`\xA7c${bombMan.name} \xA7fexplodiu!`);
    player.playSound("random.explode");
  });
  const container = bombMan.getComponent(EntityComponentTypes.Inventory).container;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type) continue;
    container.setItem(i, void 0);
  }
}
function onTransferBomb(players, bombMan, oldBombMan) {
  const gameConf = GERAL_CONF.games.bomb_party;
  if (oldBombMan && oldBombMan.isValid) {
    console.log("limpar o inventarido de", oldBombMan.name);
    const container2 = oldBombMan.getComponent(EntityComponentTypes.Inventory).container;
    for (let i = 0; i < container2.size; i++) {
      const item = container2.getItem(i);
      if (item?.typeId !== gameConf.items.bomb_item_type) continue;
      container2.setItem(i, void 0);
    }
  }
  console.log("adicionar a bomba a", bombMan.name);
  const container = bombMan.getComponent(EntityComponentTypes.Inventory).container;
  const bombItem = new ItemStack(gameConf.items.bomb_item_type);
  bombItem.lockMode = ItemLockMode.slot;
  container.setItem(0, bombItem);
  bombMan.onScreenDisplay.setTitle("\xA7l\xA7fVoc\xEA est\xE1 com a \xA7cBOMBA\xA7f!");
  players.forEach((player) => {
    player.sendMessage(`\xA7f${bombMan.name} est\xE1 com a \xA7cBOMBA\xA7f!`);
    player.playSound("block.bell.hit");
  });
}
function onExitPlayer(player) {
  player.teleport(GERAL_CONF.locations.lobby);
  player.stopMusic();
  player.getEffects().forEach((e) => player.removeEffect(e.typeId));
  const container = player.getComponent(EntityComponentTypes.Inventory).container;
  container.clearAll();
}
function onPlayerJoin(player, pos) {
  player.setGameMode(GameMode.Adventure);
  player.runCommand("effect @s resistance infinite 255 true");
  player.runCommand("effect @s saturation infinite 255 true");
  player.getEffects().forEach((e) => console.log(e.duration));
  player.teleport({
    x: randomBetween(pos.start.x, pos.end.x),
    y: randomBetween(pos.start.y, pos.end.y),
    z: randomBetween(pos.start.z, pos.end.z)
  });
  const container = player.getComponent(EntityComponentTypes.Inventory).container;
  container.clearAll();
  const exitItem = new ItemStack(GERAL_CONF.games.bomb_party.items.exit_item_type);
  exitItem.lockMode = ItemLockMode.slot;
  container.setItem(8, exitItem);
}
var MusicManager = class {
  static lastTrackers = /* @__PURE__ */ new Map();
  static playRandomMusic(players, mapId) {
    const musics = GERAL_CONF.games.bomb_party.sounds.musics;
    const tracker = this.lastTrackers.get(mapId);
    let index = 0;
    do {
      index = Math.floor(Math.random() * musics.length);
    } while (index === tracker);
    const music = musics[index];
    players.forEach((player) => {
      console.log(music);
      player.stopMusic();
      system2.run(() => player.playMusic(music));
    });
    this.lastTrackers.set(mapId, index);
  }
  static stopSound(players) {
    players.forEach((player) => player.stopMusic());
  }
};
var BombPatyGame = class {
  // CRIADOR DE INSTANCIAS DE PARTIDAS
  players = /* @__PURE__ */ new Set();
  // LISTA DE JOGADORES
  gameId;
  bombMan = null;
  // PLAYER COM A BOMBA
  state = 0 /* Waiting */;
  constructor(gameId) {
    this.gameId = gameId;
    BombPartyManager.AddGame(gameId, this);
    console.log("[BombaPartyGame]: New game stance");
  }
  start() {
    console.log("[BombaPartyGame]: Starting...");
    if (this.state !== 0 /* Waiting */) return;
    const gameConf = GERAL_CONF.games.bomb_party;
    if (this.players.size < gameConf.min_players) return;
    this.state = 1 /* Starting */;
    this.startRound();
    console.log("[BombaPartyGame]: Game started!");
  }
  startRound() {
    console.log("[BombaPartyGame]: Starting Round...");
    if (this.state !== 1 /* Starting */ && this.state !== 3 /* BetweenRounds */) return;
    this.state = 1 /* Starting */;
    const gameConf = GERAL_CONF.games.bomb_party;
    const initialTimer = ({ cancelTimer, currentTime }) => {
      if (this.state === 4 /* Finished */) return cancelTimer();
      this.players.forEach((player) => screenStartTimer(player, 5 - currentTime));
    };
    const bombTimer = ({ cancelTimer, currentTime }) => {
      if (this.state === 4 /* Finished */) return cancelTimer();
      this.players.forEach((player) => screenDetoneTimer(player, gameConf.game_duration - currentTime));
    };
    const onStartRound = () => {
      if (this.state !== 1 /* Starting */) return;
      if (this.players.size < GERAL_CONF.games.bomb_party.min_players) return this.end();
      const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
      this.bombMan = bombMan;
      this.state = 2 /* Running */;
      onTransferBomb([...this.players], bombMan);
      TimerManager.SetTimer(gameConf.game_duration, bombTimer, onDetoneBomb);
      SpecialEntity.SetEntities(gameConf.power_ups);
      console.log("[BombaPartyGame]: Round started!");
      MusicManager.playRandomMusic([...this.players], this.gameId);
    };
    const onDetoneBomb = () => {
      if (this.state !== 2 /* Running */) return;
      console.log("[BombaPartyGame]: Bomb detoned!");
      if (this.bombMan) {
        console.log("[BombaPartyGame]:", this.bombMan.name, "died!");
        bombManDetoned([...this.players], this.bombMan);
      }
      this.endRound();
      MusicManager.stopSound([...this.players]);
    };
    TimerManager.SetTimer(5, initialTimer, onStartRound);
  }
  end() {
    console.log("[BombaPartyGame]: ending Game...");
    this.players.forEach((player) => {
      BombPartyManager.RemovePlayer(player.id);
      if (player.isValid) onExitPlayer(player);
    });
    this.players.clear();
    this.state = 4 /* Finished */;
    BombPartyManager.RemoveGame(this.gameId);
    console.log("[BombaPartyGame]: Game Kill!");
  }
  endRound() {
    console.log("[BombaPartyGame]: ending Round...");
    const gameConf = GERAL_CONF.games.bomb_party;
    this.bombMan = null;
    this.state = 3 /* BetweenRounds */;
    system2.runTimeout(() => {
      if (this.state !== 3 /* BetweenRounds */) return;
      if (this.players.size >= gameConf.min_players) {
        this.startRound();
      } else {
        this.end();
      }
    }, 60);
  }
  join(player) {
    if (this.state === 4 /* Finished */) return;
    if (BombPartyManager.GetPlayerGame(player.id)) return;
    if (this.players.has(player)) return;
    const gameConf = GERAL_CONF.games.bomb_party;
    if (this.players.size >= gameConf.max_players) return;
    this.players.add(player);
    BombPartyManager.AddPlayer(player.id, this);
    const pos = gameConf.maps[this.gameId].spawn_area;
    onPlayerJoin(player, pos);
  }
  onHit(attacker, victim) {
    if (this.state !== 2 /* Running */) return;
    console.log("[BombaPartyGame]: on Hit");
    if (attacker.id !== this.bombMan?.id) return;
    const item = attacker.getComponent(EntityComponentTypes.Equippable).getEquipmentSlot(EquipmentSlot.Mainhand).getItem();
    if (item?.typeId !== GERAL_CONF.games.bomb_party.items.bomb_item_type) return;
    this.bombMan = victim;
    onTransferBomb([...this.players], victim, attacker);
  }
  leave(playerId) {
    const player = [...this.players].find((p) => p.id === playerId);
    BombPartyManager.RemovePlayer(playerId);
    if (player) {
      this.players.delete(player);
      if (player.isValid) onExitPlayer(player);
    }
    if (this.players.size === 0) return this.end();
    if (playerId !== this.bombMan?.id) return;
    this.bombMan = null;
    if (this.state !== 2 /* Running */) return;
    const bombMan = [...this.players][Math.floor(Math.random() * this.players.size)];
    if (bombMan) {
      this.bombMan = bombMan;
      onTransferBomb([...this.players], bombMan);
    }
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
  static GetPlayerGame(playerId) {
    return this.PlayersInGames.get(playerId);
  }
  static AddPlayer(playerId, game) {
    if (this.PlayersInGames.has(playerId)) return;
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
    if (event.hitEntity.typeId !== "minecraft:player" || event.damagingEntity.typeId !== "minecraft:player") return;
    console.log("[BombaPartyManager]: on hit event");
    const attacker = event.damagingEntity;
    const victim = event.hitEntity;
    const game = this.GetPlayerGame(attacker.id);
    if (!game || game !== this.GetPlayerGame(victim.id)) return;
    game.onHit(attacker, victim);
  }
  static OnItemUse(event) {
    const game = this.GetPlayerGame(event.source.id);
    if (!game) return;
    const itemList = GERAL_CONF.games.bomb_party.items;
    if (event.itemStack.typeId === itemList.exit_item_type) {
      game.leave(event.source.id);
    }
  }
  static OnLeave(event) {
    const game = this.PlayersInGames.get(event.playerId);
    if (!game) return;
    game.leave(event.playerId);
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
import { world as world2 } from "@minecraft/server";
world2.afterEvents.playerInteractWithEntity.subscribe(function(event) {
  const gameId = GERAL_CONF.npc_of_game[event.target.typeId];
  const joinInGame = {
    "bomb_party": bombPartyInterface
  };
  joinInGame[gameId]?.(event.player);
});

// scripts/event_routers.ts
import { world as world3 } from "@minecraft/server";

// scripts/features/pressure_plate_actions.ts
function superJump(player, pw1, pw2) {
  const view = player.getViewDirection();
  player.applyKnockback({ x: view.x * pw2, z: view.z * pw2 }, pw1);
}
var PressurePlateActions = class {
  static OnPush(event) {
    const locKey = `${event.block.x} ${event.block.y} ${event.block.z}`;
    const conf = GERAL_CONF.pressure_plates[locKey];
    if (conf.action === "super_jump") {
      return superJump(event.source, conf.vertical_power, conf.horizontal_power);
    }
  }
};

// scripts/lobby/players_join.ts
import { EntityComponentTypes as EntityComponentTypes2 } from "@minecraft/server";
function onPlayerJoinInWorld(event) {
  if (!event.initialSpawn) return;
  const player = event.player;
  const location = GERAL_CONF.locations.lobby;
  const container = player.getComponent(EntityComponentTypes2.Inventory).container;
  container.clearAll();
  player.getEffects().forEach((e) => player.removeEffect(e.typeId));
}

// scripts/event_routers.ts
world3.afterEvents.entityHitEntity.subscribe(function(event) {
  BombPartyManager.OnHitEvent(event);
  SpecialEntity.OnHit(event);
});
world3.afterEvents.itemUse.subscribe(function(event) {
  BombPartyManager.OnItemUse(event);
});
world3.afterEvents.pressurePlatePush.subscribe(function(event) {
  PressurePlateActions.OnPush(event);
});
world3.afterEvents.playerLeave.subscribe(function(event) {
  BombPartyManager.OnLeave(event);
});
world3.afterEvents.playerSpawn.subscribe(function(event) {
  onPlayerJoinInWorld(event);
});

// scripts/system.ts
import { system as system4, world as world5 } from "@minecraft/server";

// scripts/games/mobs_karts/karts_maneger.ts
import { EntityComponentTypes as EntityComponentTypes3, InputMode, system as system3, world as world4 } from "@minecraft/server";
function getMovementInput(rider) {
  const inputMode = rider.inputInfo.lastInputModeUsed;
  if (inputMode === InputMode.KeyboardAndMouse) {
    const { x: valueX, y: valueY } = rider.inputInfo.getMovementVector();
    return {
      throttle: Math.sign(valueY),
      steering: Math.sign(valueX)
    };
  }
}
var MobsKart = class {
  entity;
  acceleration;
  turnSpeed;
  maxSpeed;
  get currentSpeed() {
    const velocity = this.entity.getVelocity();
    return {
      ...velocity,
      hypotSpeed: Math.hypot(velocity.x, velocity.z)
    };
  }
  get isOnGround() {
    const hit = this.entity.dimension.getBlockFromRay(
      this.entity.location,
      { x: 0, y: -1, z: 0 },
      { maxDistance: 1 }
    );
    return hit !== void 0;
  }
  get id() {
    return this.entity.id;
  }
  get isValid() {
    return this.entity.isValid;
  }
  constructor(arg0) {
    this.entity = arg0.entity;
    this.maxSpeed = arg0.maxSpeed;
    this.turnSpeed = arg0.turnSpeed;
    this.acceleration = arg0.acceleration;
  }
  // colision(currentSpeed: number) {
  //   this.entity.dimension.getBlockFromRay()
  // }
  // physic(throttle: number, steering: number, currentSpeed: CurrentSpeedType) {
  //   console.log(Math.sin(currentSpeed.x));
  //   // console.log(((currentSpeed.x / currentSpeed.hypotSpeed) ?? 0));
  //   if (currentSpeed.hypotSpeed > 0.5 && Math.abs(throttle) < 0.01) {
  //     // console.log(currentSpeed.x, currentSpeed.z);
  //     // console.log((Math.abs(currentSpeed.x) - 0.05) * Math.sign(currentSpeed.x));
  //     // return
  //     // const speed = currentSpeed.hypotSpeed
  //     // this.entity.applyImpulse({
  //     //   x: (speed > 0 ? currentSpeed.x / speed : 0) * 0.6,
  //     //   y: 0,
  //     //   z: (speed > 0 ? currentSpeed.z / speed : 0) * 0.6
  //     // })
  //   }
  // }
  accelerate(throttle, view, currentSpeed) {
    const modifiedMaxSpeed = throttle < 0 ? 0.5 : this.maxSpeed;
    if (currentSpeed.hypotSpeed > modifiedMaxSpeed || Math.abs(throttle) < 0.01) return;
    const impulse = (0.01 + currentSpeed.hypotSpeed) * this.acceleration * throttle;
    this.entity.applyImpulse({
      x: view.x * impulse,
      y: 0,
      z: view.z * impulse
    });
  }
  turn(steering, throttle, currentSpeed) {
    if (Math.abs(steering) < 0.01) return;
    const rot = this.entity.getRotation();
    const turnFactor = Math.min(1, currentSpeed.hypotSpeed / this.maxSpeed);
    this.entity.setRotation({
      x: rot.x,
      y: rot.y - steering * this.turnSpeed * turnFactor * Math.sign(throttle)
    });
  }
  getRider() {
    const rideable = this.entity.getComponent(EntityComponentTypes3.Rideable);
    const rider = rideable.getRiders()[0];
    return rider;
  }
  update() {
    if (!this.entity.isValid) return;
    const rider = this.getRider();
    if (!rider) return;
    const view = this.entity.getViewDirection();
    const currentSpeed = this.currentSpeed;
    const { steering, throttle } = getMovementInput(rider);
    this.accelerate(throttle, view, currentSpeed);
    this.turn(steering, throttle, currentSpeed);
  }
};
var MobsKartManager = class {
  static karts = /* @__PURE__ */ new Map();
  static register(definition) {
    const existing = this.karts.get(definition.entity.id);
    if (existing) return existing;
    const kart = new MobsKart(definition);
    this.karts.set(definition.entity.id, kart);
    return kart;
  }
  static getKart(entityId) {
    return this.karts.get(entityId);
  }
  static removeKart(entityId) {
    this.karts.delete(entityId);
  }
  static update() {
    for (const [id, kart] of this.karts) {
      if (!kart.isValid) {
        this.karts.delete(id);
        continue;
      }
      kart.update();
    }
  }
};
var lastBounce = /* @__PURE__ */ new Map();
function bounceKart(entity, elasticity = 0.6) {
  if (!entity.isValid) return;
  const velocity = entity.getVelocity();
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < 0.05) return;
  const tick = system3.currentTick;
  if (tick - (lastBounce.get(entity.id) ?? -100) < 4) return;
  const direction = {
    x: velocity.x / speed,
    y: 0,
    z: velocity.z / speed
  };
  const hit = entity.dimension.getBlockFromRay(
    {
      x: entity.location.x,
      y: entity.location.y + 0.7,
      z: entity.location.z
    },
    direction,
    {
      maxDistance: 1.6,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    }
  );
  if (!hit) return;
  const normals = {
    North: { x: 0, y: 0, z: -1 },
    South: { x: 0, y: 0, z: 1 },
    East: { x: 1, y: 0, z: 0 },
    West: { x: -1, y: 0, z: 0 }
  };
  const normal = normals[hit.face];
  if (!normal) return;
  const dot = velocity.x * normal.x + velocity.z * normal.z;
  if (dot >= 0) return;
  const reflected = {
    x: velocity.x - (1 + elasticity) * dot * normal.x,
    y: velocity.y,
    z: velocity.z - (1 + elasticity) * dot * normal.z
  };
  entity.clearVelocity();
  entity.applyImpulse(reflected);
  lastBounce.set(entity.id, tick);
}
system3.runInterval(() => {
  const dimension = world4.getDimension("overworld");
  for (const kart of dimension.getEntities({
    type: "wgames:iron_golem_kart"
  })) {
    bounceKart(kart, 0.6);
  }
}, 1);

// scripts/system.ts
system4.runInterval(function() {
  SpecialEntity.ProximitScan();
  MobsKartManager.update();
});
system4.run(function() {
  const dimension = world5.getDimension("overworld");
  dimension.getEntities({ type: "wgames:iron_golem_kart" }).forEach((e) => e.remove());
  const player = world5.getPlayers()[0];
  const entity = dimension.spawnEntity("wgames:iron_golem_kart", player.location);
  MobsKartManager.register({
    entity,
    maxSpeed: 1.4,
    turnSpeed: 6,
    acceleration: 0.3
  });
});

//# sourceMappingURL=../debug/main.js.map
