---
title: Setting Up a Home Neuroagentic Network
date: 2026-06-20T22:49:00.000-05:00
image: /img/uploads/agentic-brain.jpg
image_alt: a stylized brain with segments depicting an ai agent hierarchy of roles
category: Technical
tags:
  - writings
status: Published
visibility: false
description: Meet the nine agents that run my home cluster, plus the hardware
  they sit on and the rules that keep their work accountable.
---
Most agent setups collapse into a single chat window with one personality and one set of tools. That is fine for a demo, but it falls apart over a longer run. The context window fills with history that no longer matters, tools fire without oversight, costs climb, and it gets hard to say which decision came from where.

A home neuroagentic network takes the opposite approach. Physical machines stand in for brain regions, a software org chart stands in for cognitive roles, and the two layers pass work through signed handoffs over a shared message bus. The rest of this post walks through those systems and the design problem each one is meant to solve.

#### The network: hardware and software

"Neuroagentic" means the cluster is shaped like a brain at two levels. Hardware nodes handle sensation, routing, and compute; software agents handle judgment, memory, and action. The mapping is a design aid, not a constraint. Where biology and engineering disagree, engineering wins.

**Hardware.** A Mac Studio is the prefrontal cortex: the central node where all LLM work runs, including the standing agents, the swarm pool, and long-term memory. A lightweight Raspberry Pi is the thalamus, a stateless gateway at the edge that receives outside input (chat, Discord, dashboards) and forwards it inward without running models. A second, larger Raspberry Pi is the hippocampus: the MQTT message bus, the process watchdog, and home automation. Sensory input enters at the gateway, crosses the coordinator, and reaches cognition on the Studio.

**Software.** On that hardware sits the agent hierarchy below: nine persistent agents with fixed lanes, plus short-lived swarm workers for cheap parallel tasks. Deterministic routing rules act as a basal ganglia layer, sending simple requests to scripts instead of waking a model. Together, the nodes are the nervous system; the cast is the mind running on it.

#### Why a hierarchy

A single agent asked to be executive, engineer, researcher, security officer, and accountant will quietly default to whichever role is easiest at the time. Splitting those responsibilities into fixed lanes, each with a clear owner, makes the system far more predictable and observable, and most of the design below follows from that one necessity.

| **Problem**            | **Response**                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role confusion         | One lane per standing agent: build, research, governance, security, and so on                                                                                  |
| Ungoverned tools       | Gatekeepers own powerful capabilities; others route to the owner or borrow access for a limited time                                                           |
| Context bloat          | Identity, rules, and personality load only when they are relevant                                                                                              |
| Cost runaway           | Targeted LLM tier usage; Cheap swarm workers for routine jobs, heavier models reserved for standing agents/important tasks, all under a scheduled spending cap |
| Premature "done"       | Automated checks plus a separate grader before any work closes                                                                                                 |
| Weak accountability    | Signed handoffs and a log of every governance decision                                                                                                         |
| Chat as the only queue | A shared workspace and jobboard for durable, asynchronous work                                                                                                 |
| Stale memory           | Nightly consolidation that summarizes old context instead of dropping it                                                                                       |
| Runaway autonomy       | Modes and seasons that scope how independent the system is                                                                                                     |

#### The standing cast

The standing cast is a persistent org chart of nine agents, each with a stable identity and a dedicated lane of responsibility. I sit outside the tree as the owner (and as a human) with final authority, and Homer is the only agent I speak to directly. Everything I ask flows down through him, and anything that needs my attention comes back up the same way.

| Level        | Who                             | Role                                  |
| ------------ | ------------------------------- | ------------------------------------- |
| Executive    | Homer                           | My interface to the cluster           |
| Coordination | Stuart                          | Plans work and keeps the team in sync |
| Triad        | Wright, Argus, Lucy             | Build, research, reflection           |
| Specialists  | Ira, Robin, Nerva               | Visualization, governance, security   |
| Sub-Agents   | Tess (Build eval)               | Subordinate to a higher tier agent    |
| Swarm        | reader, reviewer, summarizer, … | One-shot workers, outside the tree    |

```
Jake (me)
 │
 └── Homer (executive) ───────────── dispatch: all
      └── Stuart (coordination) ──── dispatch: team
           │
           ├── Triad ──────────────────────────────┐
           │    ├── Wright (build)                   │
           │    │    └── Tess (evaluator)            │  standing agents
           │    ├── Argus (research)                 │  (dispatch tree)
           │    └── Lucy (reflection)                │
           │                                         │
           └── Specialists ──────────────────────────┘
                ├── Ira (visualization)
                ├── Robin (governance)
                └── Nerva (security)

Swarm pool ──▶ reader · reviewer · summarizer · test author · …
         ▲
         └── summoned by any agent in the standing cast; outside the hierarchy
```

Below Homer, Stuart handles coordination: arbitrating between agents, running the project portfolio, and keeping the job board moving. The triad under him does the everyday cognition, with Wright building, Argus researching and owning the cluster's connection to the outside web, and Lucy holding long term context and tending memory. The specialists cover narrower domains that each deserve a dedicated owner: Ira for charts and the observation interface, Robin for governance and version control, and Nerva for security monitoring and interacting with anything physical in the house. Tess sits beneath Wright as a deliberate check on his work, which is worth describing on its own.

#### How work moves

Keeping the ways agents talk to each other distinct is part of what keeps the system easy to reason about. A dispatch is a blocking, signed handoff from one standing agent to another, used whenever a task needs real judgment or coordination. A summon is a lighter, one-shot call down to a swarm worker for bounded text work such as reading a document, summarizing it, or drafting tests. For anything that should outlive a single conversation, agents post findings to a shared workspace and pick up tasks from a job board, so long work can proceed in the background instead of living inside one chat thread. Agents can also ask each other read-only questions without handing off any work at all. Every one of these paths is signed and checked against policy, so the system always knows who asked for what and whether they were allowed to.

The swarm sits apart from all of this on purpose. Its workers are cheap, stateless, and have no tools of their own; they take chunks in and return chunks out, and a standing agent decides what to do with the result. That keeps the cost of routine parallel work low and the surface for mistakes small.

#### Evidence before "done"

Building software is where an unsupervised agent most often reports success it has not actually earned, so coding work follows a planner, generator, evaluator pattern that keeps those roles in separate hands. Stuart frames the task and passes it to Wright, who agrees on acceptance criteria up front, sometimes has a swarm worker draft the tests first, and then implements against that contract. Before anything counts as finished, an automated suite produces objective evidence that it works, and a separate evaluator, Tess, reviews the result in a clean context against a fixed rubric, with no ability to edit what she is grading. She returns a pass or sends it back with specific findings. Completion always rests on that evidence rather than an agent's own confidence, which is the same discipline that keeps the swarm cheap applied to work that matters more.

#### Owners for Powerful tools

Some capabilities are powerful enough that they should not be in every agent's hands: reaching out to the open web, writing to version control, reading the cold memory archive, or actuating anything physical. Each of these has a single owner. By default, an agent that needs one routes the request to that owner, who carries it out and stays accountable for it. When going through the owner would be needlessly slow, the owner can grant a narrow, time-limited permission for the other agent to act directly, and that borrowed access still passes through the same safety checks. The effect is that powerful actions always trace back to someone responsible for them.

Underneath this sit four pillars, Security, Reliability, Pithiness, and Clarity, which act as the standing contract for how agents behave. They translate into concrete habits throughout the system, from signed handoffs and narrow file access to bounded retries and a redaction pass before anything is published.

#### Lean context and personality

A persistent cast creates a problem that one-off agents avoid. If every agent dragged its full identity, history, and personality into every prompt, context would balloon and cost with it. So context is assembled to fit the moment. Core identity and rules load when they bear on the task at hand, deeper skills are pulled in only when a job calls for them, and an agent's personality is kept separate and added only in social or demo settings. The payoff is a lean prompt during real work and a richer one when the situation genuinely warrants it.

#### A sense of time and posture

The cluster has a notion of what it should be doing right now. A mode is its current operating state, shaping how it routes requests, how patient it is, how cautious it is, and whether personality is allowed at all. Those modes include states like; an ordinary workday, a quiet overnight period for consolidating memory, and a security lockdown, among others. Seasons sit above modes as longer-term rhythms that schedule those states across each day, week, or month and hold the cluster to a scheduled spending limit. Just as important, autonomy is opt-in: background watching and scheduled sweeps stay off until I enable them, while ordinary interactive use is always available. Together these let me decide exactly how much independence the system has at any given time, instead of facing a single on-or-off switch.

To make sure the structure actually holds up under load, the cluster periodically runs drills at escalating cost, from free static checks up to full multi agent exercises, confirming that agents still hand off and recover the way they are supposed to.

#### Structure for long work

Not everything is a quick request. Some work is a project that runs for days, and that needs more structure than a chat thread. Ideas enter as proposals and move through a ledger with real states, from pending to approved, deferred, or rejected, after passing a review chain that weighs them for duplication, priority, risk, cost, and governance before anyone spends effort. Approved proposals become projects with their own goals, milestones, and task lists. The larger or more irreversible the work, the higher its approval has to climb, ultimately to me for anything that cannot be undone. When that work touches shared code, it usually arrives as a GitHub pull request I merge or close. The intent is to give long horizon work the same intake, ownership, and checkpoints a small team would use.

#### Memory that ages gracefully

Memory is tiered so that recent, relevant context stays close while older material is condensed rather than discarded. A nightly consolidation pass, run by Lucy, rolls older memories into summaries and records how much detail each one keeps, down to archive-only at the far end, with the cold archive itself behind a gate. The goal is to counter the slow decay that affects any long lived agent, where context either grows without bound or quietly disappears.

#### Governance for anything that leaves home

When work needs to go beyond the home network, it passes through a governance loop first. Findings are validated, triaged, and adjudicated up the chain before anything is written externally, sensitive details are redacted on the way out, and every step is recorded. The cluster opens GitHub issues and pull requests when it is ready to act; I approve or reject them there. External action carries the most risk, so it gets the most oversight.

#### Seeing what it does

A system this active is only trustworthy if you can watch it work. An observation portal/command center renders the cluster's live state; its agents, projects, tasks, pending proposals, and governance queue, and a single ledger records every LLM model call so any request can be followed from start to finish. The live aggregate view of all agent/cluster data is locked to the executive layer, so observability stays a window onto the system rather than a backdoor into everyone's context. (No Argus, you can't try to read what Lucy was thinking about this morning.) 

#### One interface, editor, and cluster

Finally, the same operations the agents use are exposed to my Cursor editor through MCP, so I can check status, hand off work, search memory, or summon a worker without leaving the place I already write code. A single configuration defines those tools, the agents' commands, and the swarm roles together, which keeps the editor and the running cluster describing the same system.

#### Putting it together

Taken as a whole, these systems describe a home cluster that behaves like a small, accountable team rather than a single tireless chatbot. It has clear roles and one point of contact, cheap help for routine work, evidence before anything is called done, named owners for every powerful tool, context that stays lean until it needs to be rich, autonomy I can dial up or down, real process for work that outlasts a conversation, memory that ages gracefully, and enough visibility to trust the whole thing while it runs.
