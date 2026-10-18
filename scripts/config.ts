export const GERAL_CONF = {
  "npc_of_game": {
    "wgames:bomb_party_npc": "bomb_party"
  },
  "locations": {
    "lobby": { x: 2, y: 1, z: 3 } // 2 1 3
  },
  "power_up_types": {
    "wgames:speed_power_up": {
      "effect": "speed",
      "power": 2,
      "duration": 100 // ticks
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
            { x: 7, y: 5, z: 1000 },
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
          'bomba_party.music.01',
          'bomba_party.music.02',
          'bomba_party.music.03',
          'bomba_party.music.04'
        ]
      },
      "maps": {
        "Arena_1": {
          "spawn_area": {
            "start": { x: -28, y: 0, z: 1008 }, // -28 0 1008
            "end": { x: -6, y: 0, z: 986 } // -6 0 986
          }
        }
      }
    }
  }
}