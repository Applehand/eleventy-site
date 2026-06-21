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
Most agent setups collapse into a single chat window with one personality and one set of tools. That works for a demo. Over a longer run, the context window fills with history that no longer matters, tools fire without oversight, costs climb, and it gets hard to say which decision came from where.

A home neuroagentic network takes a different approach. Physical machines stand in for brain regions, a software org chart stands in for cognitive roles, and the two layers pass work through signed handoffs over a shared message bus. What follows is how those pieces fit together and what problem each one solves.

#### The network: hardware and software

"Neuroagentic" means the cluster is shaped like a brain at two levels. Hardware nodes handle sensation, routing, and compute; software agents handle judgment, memory, and action. The mapping is a design aid, not a constraint. Where biology and engineering disagree, engineering wins.

**Hardware.** A Mac Studio is the prefrontal cortex: the central node where all LLM work runs, including the standing agents, the swarm pool, and long-term memory. A lightweight Raspberry Pi is the thalamus, a stateless gateway at the edge that receives outside input (chat, Discord, dashboards) and forwards it inward without running models. A second, larger Raspberry Pi is the hippocampus: the MQTT message bus, the process watchdog, and home automation. Sensory input enters at the gateway, crosses the coordinator, and reaches cognition on the Studio.

**Software.** On that hardware sits the agent hierarchy: nine persistent agents with fixed lanes, plus short-lived swarm workers for cheap parallel tasks. Deterministic routing rules act as a basal ganglia layer, sending simple requests to scripts instead of waking a model. The nodes are the nervous system; the cast is the mind running on it.

#### Why a hierarchy

A single agent asked to be executive, engineer, researcher, security officer, and accountant will quietly default to whichever role is easiest at the time. Splitting those responsibilities into fixed lanes, each with a clear owner, makes the system more predictable. Most of the design choices here start from that split.

| **Problem**            | **Response**                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role confusion         | One lane per standing agent: build, research, governance, security, and so on                                                                                  |
| Ungoverned tools       | Three tool kinds (rules, skills, commands) plus gatekeepers for high-risk commands; others route to the owner or borrow access for a limited time |
| Context bloat          | Identity, rules, and personality load only when they are relevant                                                                                              |
| Cost runaway           | Targeted LLM tier usage; cheap swarm workers for routine jobs, heavier models reserved for standing agents and important tasks, all under a scheduled spending cap |
| Premature "done"       | Automated checks plus a separate grader before any work closes                                                                                                 |
| Weak accountability    | Signed handoffs and a log of every governance decision                                                                                                         |
| Chat as the only queue | A shared workspace and job board for durable, asynchronous work                                                                                                 |
| Stale memory           | Nightly consolidation that summarizes old context instead of dropping it                                                                                       |
| Runaway autonomy       | Modes and seasons that scope how independent the system is                                                                                                     |

#### The standing cast

The standing cast is a persistent org chart of nine agents, each with a stable identity and a dedicated lane of responsibility. I sit outside the tree as the owner with final authority, and Homer is the only agent I speak to directly. Everything I ask flows down through him, and anything that needs my attention comes back up the same way.

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

Below Homer, Stuart handles coordination: arbitrating between agents, running the project portfolio, and keeping the job board moving. The triad under him does the everyday work, with Wright building, Argus researching and owning the cluster's connection to the outside web, and Lucy holding long-term context and tending memory. The specialists cover narrower domains that each deserve a dedicated owner: Ira for charts and the observation interface, Robin for governance and version control, and Nerva for security monitoring and interacting with anything physical in the house. Tess sits beneath Wright as a check on his work.

#### How work moves

Keeping the ways agents talk to each other distinct makes the system easier to follow. A dispatch is a blocking, signed handoff from one standing agent to another, used whenever a task needs real judgment or coordination. A summon is a lighter, one-shot call down to a swarm worker for bounded work on a chunk of material: reading a document, summarizing a thread, reviewing a screenshot, or drafting tests. For anything that should outlive a single conversation, agents post findings to a shared workspace and pick up tasks from a job board, so long work can proceed in the background instead of living inside one chat thread. Agents can also ask each other read-only questions without handing off any work. Every path is signed and checked against policy, so the system always knows who asked for what and whether they were allowed to.

The swarm sits apart from all of this on purpose. Its workers are cheap, stateless, and have no tools of their own; they take chunks in and return chunks out, and a standing agent decides what to do with the result. That keeps the cost of routine parallel work low and the surface for mistakes small.

#### Choosing the right tool

Not every problem deserves the same mechanism. Mixing them up is how agent systems get expensive and sloppy. In this cluster, a **tool** is anything an agent is allowed to use: standing policy, expertise pulled when needed, or a deterministic script. They fall into three kinds. The choice between them is mostly about when the capability should load and how much judgment it needs.

**Rules** are always-on or scope-based guidance: identity files, hierarchy, the four pillars, and file-type conventions that load only when someone is editing Python or prose. They shape behavior without being invoked. **Skills** are markdown playbooks pulled on demand when a task matches, like assessing whether a commit is safe to land, redacting a draft for publication, or running a structured code-evaluation rubric. **Commands** are the deterministic layer: shell wrappers and CLI entrypoints that call the gateway, post to the job board, search recent memory, or hand off to another agent. If the outcome should be the same every time, it belongs here.

Need standing posture or file-scoped habits? Load a rule. Need expert judgment for a recognizable task type? Pull a skill. Need a fixed script with a signed API call at the end? Run a command. Swarm workers sit outside this split entirely. They are summoned for bounded input chunks (text, images, diffs, whatever fits in the prompt) and return chunks back, with no tools of their own.

**Dispatch** and **summon** are commands too, but they are the coordination ones: dispatch when another standing agent should own the judgment, summon when parallelizable chunk work fits a swarm role. Other commands are operational: memory search, job-board posts, chart generation, where the script path is fixed. **Skills** fill the gap when the work needs a structured playbook but not a full handoff. An ops router handles a fourth lane for simple operator requests ("what mode are we in?", "show recent cost") by mapping natural language to allowlisted scripts instead of waking a standing agent.

Each agent carries a different subset of these capabilities, declared in one central list so enforcement stays consistent everywhere: the running cluster, the gateway, dispatch signing, and the MCP tools in my editor all read the same source. Agents see a short daily list for common work and can list the full grant set when they need it. A discovery command ranks skills by task description when the right playbook is not obvious. Broad commands are shared widely. Narrow, high-risk ones are gated to a single owner.

#### Evidence before "done"

Building software is where an unsupervised agent most often reports success it has not actually earned, so coding work follows a planner, generator, evaluator pattern that keeps those roles in separate hands. Stuart frames the task and passes it to Wright, who agrees on acceptance criteria up front, sometimes has a swarm worker draft the tests first, and then implements against that contract. Before anything counts as finished, an automated suite produces objective evidence that it works, and a separate evaluator, Tess, reviews the result in a clean context against a fixed rubric, with no ability to edit what she is grading. She returns a pass or sends it back with specific findings. Completion rests on that evidence rather than an agent's own confidence.

#### Owners for powerful commands

Some **commands** are powerful enough that they should not sit in every agent's tool list: reaching out to the open web, writing to version control, reading the cold memory archive, observing the full cluster state, or actuating anything physical. Each gated command has a single owner. By default, an agent that needs one routes the request to that owner via dispatch, who carries it out and stays accountable for it. When going through the owner would be too slow, the owner can use an attestation skill to issue a narrow, time-limited permission for the other agent to invoke the command directly. That borrowed access still passes through the same safety checks on the gateway. Powerful actions always trace back to someone responsible for them.

Underneath this sit four pillars, Security, Reliability, Pithiness, and Clarity, which act as the standing contract for how agents behave. They translate into concrete habits throughout the system, from signed handoffs and narrow file access to bounded retries and a redaction pass before anything is published.

#### Lean context and personality

A persistent cast creates a problem that one-off agents avoid. If every agent dragged its full identity, history, and personality into every prompt, context would balloon and cost with it. Context is assembled to fit the moment. Core identity and rules load when they bear on the task at hand, deeper skills are pulled in only when a job calls for them, and an agent's personality is kept separate and added only in social or demo settings. Real work gets a lean prompt. Social or demo settings get a richer one.

#### A sense of time and posture

The cluster has a notion of what it should be doing right now. A mode is its current operating state, shaping how it routes requests, how patient it is, how cautious it is, and whether personality is allowed at all. Modes include an ordinary workday, a quiet overnight period for consolidating memory, and a security lockdown, among others. Seasons sit above modes as longer-term rhythms that schedule those states across each day, week, or month and hold the cluster to a scheduled spending limit. Autonomy is opt-in: background watching and scheduled sweeps stay off until I enable them, while ordinary interactive use is always available. Together these let me decide how much independence the system has at any given time, instead of facing a single on-or-off switch.

The cluster periodically runs drills at escalating cost, from free static checks up to full multi-agent exercises, to confirm that agents still hand off and recover the way they should.

#### Structure for long work

Not everything is a quick request. Some work is a project that runs for days, and that needs more structure than a chat thread. Ideas enter as proposals and move through a ledger with real states, from pending to approved, deferred, or rejected, after passing a review chain that weighs them for duplication, priority, risk, cost, and governance before anyone spends effort. Approved proposals become projects with their own goals, milestones, and task lists. The larger or more irreversible the work, the higher its approval has to climb, ultimately to me for anything that cannot be undone. When that work touches shared code, it usually arrives as a GitHub pull request I merge or close. Long-running work gets the same intake, ownership, and checkpoints a small team would use.

#### Memory that ages well

Memory is tiered so that recent, relevant context stays close while older material is condensed rather than discarded. A nightly consolidation pass, run by Lucy, rolls older memories into summaries and records how much detail each one keeps, down to archive-only at the far end, with the cold archive itself behind a gate. That counters the slow decay that affects any long-lived agent, where context either grows without bound or quietly disappears.

#### Governance for anything that leaves home

When work needs to go beyond the home network, it passes through a governance loop first. Findings are validated, triaged, and adjudicated up the chain before anything is written externally, sensitive details are redacted on the way out, and every step is recorded. The cluster opens GitHub issues and pull requests when it is ready to act; I approve or reject them there. External action carries the most risk, so it gets the most oversight.

#### Seeing what it does

A system this active is only trustworthy if you can watch it work. An observation portal renders the cluster's live state: its agents, projects, tasks, pending proposals, and governance queue. A single ledger records every LLM model call so any request can be followed from start to finish. The live aggregate view of all agent and cluster data is locked to the executive layer, so observability stays a window onto the system rather than a backdoor into everyone's context.

#### One interface, editor, and cluster

The same operations the agents use are exposed to my Cursor editor through MCP, so I can check status, hand off work, search memory, or summon a worker without leaving the place I already write code. A single configuration defines those commands, the agents' skills and rules, and the swarm roles together, which keeps the editor and the running cluster describing the same system.

#### Putting it together

The home cluster behaves like a small, accountable team rather than a single chatbot. It has clear roles and one point of contact, a split between rules, skills, and commands so agents pick the right mechanism for the job, cheap help for routine work, evidence before anything is called done, named owners for every powerful command, context that stays lean until it needs to be rich, autonomy I can dial up or down, real process for work that outlasts a conversation, memory that condenses instead of vanishing, and enough visibility to trust the whole thing while it runs.
