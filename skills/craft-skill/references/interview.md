# Interview protocol

For when no `grilling` skill is installed. Treat the design as a tree: each decision
opens the decisions that hang off it.

1. The **frontier** is every open decision whose prerequisites are settled. Ask the whole
   frontier in one round, numbered, each with your recommended answer, worded so "yes"
   accepts it.
2. Look facts up yourself (files, Sources, tools); put only decisions to the user.
3. Wait for answers, recompute the frontier, ask the next round.
4. Stop when the frontier is empty and the user confirms the shared understanding.
