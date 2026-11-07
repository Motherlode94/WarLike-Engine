// Bound to the bundled source clips; durations are verified against their GLB files in tests.
export const animationDemoProfiles={
 "melee": {
  "enabled": true,
  "entry": "motion",
  "states": [
   {
    "id": "motion",
    "name": "Locomotion",
    "clip": "Sword_Idle",
    "duration": 1.6666666269302368,
    "speed": 1,
    "loop": true,
    "x": 70,
    "y": 230,
    "events": [],
    "parameter": "speed",
    "blend": [
     {
      "clip": "Sword_Idle",
      "threshold": 0
     },
     {
      "clip": "Walk_Loop",
      "threshold": 4.2
     },
     {
      "clip": "Sprint_Loop",
      "threshold": 7
     }
    ]
   },
   {
    "id": "attack",
    "name": "Attaque",
    "clip": "Sword_Attack",
    "duration": 1.5333333015441895,
    "speed": 1,
    "loop": false,
    "x": 400,
    "y": 55,
    "events": []
   },
   {
    "id": "attack2",
    "name": "Deuxième attaque",
    "clip": "Punch_Cross",
    "duration": 1,
    "speed": 1,
    "loop": false,
    "x": 650,
    "y": 55,
    "events": []
   },
   {
    "id": "dodge",
    "name": "Esquive",
    "clip": "Roll",
    "duration": 1.4666666984558105,
    "speed": 1,
    "loop": false,
    "x": 900,
    "y": 55,
    "events": []
   },
   {
    "id": "hurt",
    "name": "Impact",
    "clip": "Hit_Chest",
    "duration": 0.3333333432674408,
    "speed": 1,
    "loop": false,
    "x": 400,
    "y": 205,
    "events": []
   },
   {
    "id": "death",
    "name": "Mort",
    "clip": "Death01",
    "duration": 2.4000000953674316,
    "speed": 1,
    "loop": false,
    "x": 650,
    "y": 205,
    "events": []
   }
  ],
  "transitions": [
   {
    "from": "*",
    "to": "death",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": true
     }
    ],
    "blend": 0.08,
    "interruptionSource": "next"
   },
   {
    "from": "*",
    "to": "attack",
    "conditions": [
     {
      "parameter": "attackRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "*",
    "to": "attack",
    "conditions": [
     {
      "parameter": "attacking",
      "operator": "==",
      "value": true
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "attack",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "attack2",
    "conditions": [
     {
      "parameter": "attack2Request",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "attack2",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "dodge",
    "conditions": [
     {
      "parameter": "dodgeRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "dodge",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "hurt",
    "conditions": [
     {
      "parameter": "hurtRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "hurt",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "death",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   }
  ],
  "layers": [],
  "parameters": [
   {
    "name": "attackRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "attack2Request",
    "type": "trigger",
    "default": false
   },
   {
    "name": "dodgeRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "hurtRequest",
    "type": "trigger",
    "default": false
   }
  ],
  "machines": [],
  "profileId": "melee"
 },
 "interactions": {
  "enabled": true,
  "entry": "motion",
  "states": [
   {
    "id": "motion",
    "name": "Repos",
    "clip": "idle",
    "duration": 1.3333333730697632,
    "speed": 1,
    "loop": true,
    "x": 70,
    "y": 230,
    "events": []
   },
   {
    "id": "wave",
    "name": "Saluer",
    "clip": "emote-yes",
    "duration": 0.6666666865348816,
    "speed": 1,
    "loop": false,
    "x": 400,
    "y": 55,
    "events": []
   },
   {
    "id": "sit",
    "name": "S’asseoir",
    "clip": "sit",
    "duration": 0.1666666716337204,
    "speed": 1,
    "loop": false,
    "x": 650,
    "y": 55,
    "events": []
   },
   {
    "id": "pickup",
    "name": "Ramasser",
    "clip": "pick-up",
    "duration": 0.3333333432674408,
    "speed": 1,
    "loop": false,
    "x": 900,
    "y": 55,
    "events": []
   },
   {
    "id": "interact",
    "name": "Utiliser",
    "clip": "interact-right",
    "duration": 0.6666666865348816,
    "speed": 1,
    "loop": false,
    "x": 400,
    "y": 205,
    "events": []
   },
   {
    "id": "yes",
    "name": "Répondre oui",
    "clip": "emote-yes",
    "duration": 0.6666666865348816,
    "speed": 1,
    "loop": false,
    "x": 650,
    "y": 205,
    "events": []
   },
   {
    "id": "no",
    "name": "Répondre non",
    "clip": "emote-no",
    "duration": 0.6666666865348816,
    "speed": 1,
    "loop": false,
    "x": 900,
    "y": 205,
    "events": []
   }
  ],
  "transitions": [
   {
    "from": "*",
    "to": "wave",
    "conditions": [
     {
      "parameter": "waveRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "wave",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "sit",
    "conditions": [
     {
      "parameter": "sitRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "sit",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "pickup",
    "conditions": [
     {
      "parameter": "pickupRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "pickup",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "interact",
    "conditions": [
     {
      "parameter": "interactRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "interact",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "yes",
    "conditions": [
     {
      "parameter": "yesRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "yes",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   },
   {
    "from": "*",
    "to": "no",
    "conditions": [
     {
      "parameter": "noRequest",
      "operator": "trigger"
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next"
   },
   {
    "from": "no",
    "to": "motion",
    "conditions": [
     {
      "parameter": "dead",
      "operator": "==",
      "value": false
     }
    ],
    "blend": 0.15,
    "interruptionSource": "next",
    "hasExitTime": true,
    "exitTime": 1
   }
  ],
  "layers": [],
  "parameters": [
   {
    "name": "waveRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "sitRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "pickupRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "interactRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "yesRequest",
    "type": "trigger",
    "default": false
   },
   {
    "name": "noRequest",
    "type": "trigger",
    "default": false
   }
  ],
  "machines": [],
  "profileId": "interactions"
 }
};
