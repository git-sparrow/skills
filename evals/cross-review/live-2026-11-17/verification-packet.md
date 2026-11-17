# Focused verification R1

Original finding IDs: sol-discovery-f47d13b1-e471-4e0b-93f6-715c2a9cb5cf/SOL-1, astra-discovery-c922dd48-9c47-464a-ba90-c725d9b68498/ASTRA-001.
Both reviewers identified Math.max as the cause; coordinator confirmed it by executing pinned base/head helpers with the unchanged caller.

{
  "base": [
    {
      "args": [
        3,
        5
      ],
      "result": 0
    },
    {
      "args": [
        5,
        2
      ],
      "result": 3
    },
    {
      "args": [
        5,
        0
      ],
      "result": 5
    }
  ],
  "review-head": [
    {
      "args": [
        3,
        5
      ],
      "result": -2
    },
    {
      "args": [
        5,
        2
      ],
      "result": 0
    },
    {
      "args": [
        5,
        0
      ],
      "result": 0
    }
  ],
  "repair": {
    "checks": 121,
    "description": "121 stock/request pairs from 0 through 10; remaining stock equals stock - min(stock, requested)",
    "passed": true
  }
}

Repair: restore Math.min in tracked change.mjs; original commits/refs unchanged. Verify R1, changed helper and unchanged caller invariant. No broad rediscovery. No untracked repair files.
