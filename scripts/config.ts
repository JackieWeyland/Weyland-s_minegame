export const GERAL_CONF = {
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
        "exit_item_type": "minecraft:stick",
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
}