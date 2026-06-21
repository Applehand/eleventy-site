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

This is designed to avoid those common issues. In this approach, hardware maps to brain regions and software maps to cognitive roles. Each section below covers one piece of the cluster and the problem it is meant to solve.

#### The network: hardware and software

"Neuroagentic" means the cluster is shaped like a brain at two levels. Hardware nodes handle sensation, routing, and compute; software agents handle judgment, memory, and action. The mapping is a design aid, not a constraint. Where biology and engineering disagree, engineering wins.

**Hardware.** A Mac Studio is the prefrontal cortex: the central node where all LLM work runs, including the standing agents, the swarm pool, and long-term memory. A lightweight Raspberry Pi is the thalamus, a stateless gateway at the edge that receives outside input (chat, Discord, dashboards) and forwards it inward without running models. A second, larger Raspberry Pi is the hippocampus: the MQTT message bus, the process watchdog, and home automation. Sensory input enters at the gateway, crosses the coordinator, and reaches cognition on the Studio.

**Software.** On that hardware sits the agent hierarchy: nine persistent agents with fixed lanes, plus short-lived swarm workers for cheap parallel tasks. Deterministic routing rules act as a basal ganglia layer, sending simple requests to scripts instead of waking a model. The nodes are the nervous system; the cast is the mind running on it.

#### The standing cast

A single agent asked to be executive, engineer, researcher, security officer, and accountant will quietly default to whichever role is easiest at the time. Splitting those responsibilities into fixed lanes, each with a clear owner, makes the system more predictable, and most of the design here follows from that one split.

The cast is a persistent org chart of nine agents, each with a stable identity and a dedicated lane. I sit outside the tree as the owner with final authority, and Homer is the only agent I speak to directly. Everything I ask flows down through him, and anything that needs my attention comes back up the same way. Below Homer, Stuart handles coordination. The triad under him does the everyday work: Wright builds, Argus researches and owns the cluster's connection to the outside web, and Lucy holds long-term context and tends memory. Ira, Robin, and Nerva cover visualization, governance, and security. Tess sits beneath Wright as a check on his work.

<details>
<summary>Problems a hierarchy solves</summary>

| **Problem**            | **Response**                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role confusion         | One lane per standing agent: build, research, governance, security, and so on                                                                                      |
| Ungoverned tools       | Three tool kinds (rules, skills, commands) plus gatekeepers for high-risk commands; others route to the owner or borrow access for a limited time                  |
| Context bloat          | Identity, rules, and personality load only when they are relevant                                                                                                  |
| Cost runaway           | Targeted LLM tier usage; cheap swarm workers for routine jobs, heavier models reserved for standing agents and important tasks, all under a scheduled spending cap |
| Premature "done"       | Automated checks plus a separate grader before any work closes                                                                                                     |
| Weak accountability    | Signed handoffs and a log of every governance decision                                                                                                             |
| Chat as the only queue | A shared workspace and job board for durable, asynchronous work                                                                                                    |
| Stale memory           | Nightly consolidation that summarizes old context instead of dropping it                                                                                           |
| Runaway autonomy       | Modes and seasons that scope how independent the system is                                                                                                         |

</details>

<details>
<summary>Cast levels and the dispatch tree</summary>

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

</details>

#### How work moves

Keeping the ways agents talk to each other distinct makes the system easier to follow. A dispatch is a blocking, signed handoff from one standing agent to another, used whenever a task needs real judgment or coordination. A summon is a lighter, one-shot call down to a swarm worker for bounded work on a chunk of material: reading a document, summarizing a thread, reviewing a screenshot, or drafting tests. For anything that should outlive a single conversation, agents post findings to a shared workspace and pick up tasks from a job board, so long work can proceed in the background instead of living inside one chat thread. Agents can also ask each other read-only questions without handing off any work. Every path is signed and checked against policy, so the system always knows who asked for what and whether they were allowed to.

The swarm sits apart from all of this on purpose. Its workers are cheap, stateless, and have no tools of their own; they take chunks in and return chunks out, and a standing agent decides what to do with the result. That keeps the cost of routine parallel work low and the surface for mistakes small.

#### Tools and access

Agents do not all get the same capabilities. A **tool** here is anything an agent may use, and tools come in three kinds: **rules** (always-on or scope-based guidance), **skills** (playbooks pulled on demand), and **commands** (deterministic scripts and handoffs). Which kind fits depends on when it should load and how much judgment it needs.

Context works the same way. Each markdown layer declares when it should load: core identity always, dispatch guidance only for agents that hand off work, personality only when the current mode allows it, file-type rules when the task matches. A context manifest resolves that ordered list at sync time and assembles one prompt per agent. Skills stay out until invoked. Real work gets a lean default; richer layers load only when the situation calls for them.

A few commands are powerful enough that they should not sit in every agent's hands: reaching out to the open web, writing to version control, reading the cold memory archive, observing the full cluster state, or actuating anything physical. Each of those is gated to a single owner. Another agent that needs one routes a request to that owner, or borrows a narrow, time-limited grant that still passes the same safety checks on the gateway. Powerful actions always trace back to someone responsible for them.

<details>
<summary>The three kinds of tools, in detail</summary>

**Rules** are always-on or scope-based guidance: identity files, hierarchy, the four pillars, and file-type conventions that load only when someone is editing Python or prose. They shape behavior without being invoked. **Skills** are markdown playbooks pulled on demand when a task matches, like assessing whether a commit is safe to land, redacting a draft for publication, or running a structured code-evaluation rubric. **Commands** are the deterministic layer: shell wrappers and CLI entrypoints that call the gateway, post to the job board, search recent memory, or hand off to another agent. If the outcome should be the same every time, it belongs here.

Need standing posture or file-scoped habits? Load a rule. Need expert judgment for a recognizable task type? Pull a skill. Need a fixed script with a signed API call at the end? Run a command. Swarm workers sit outside this split entirely. They are summoned for bounded input chunks (text, images, diffs, whatever fits in the prompt) and return chunks back, with no tools of their own.

**Dispatch** and **summon** are commands too, but they are the coordination ones: dispatch when another standing agent should own the judgment, summon when parallelizable chunk work fits a swarm role. Other commands are operational: memory search, job-board posts, chart generation, where the script path is fixed. An ops router handles a fourth lane for simple operator requests ("what mode are we in?", "show recent cost") by mapping natural language to allowlisted scripts instead of waking a standing agent.

Each agent carries a different subset of these capabilities, declared in one central list so enforcement stays consistent everywhere: the running cluster, the gateway, dispatch signing, and the MCP tools in my editor all read the same source. Agents see a short daily list for common work and can list the full grant set when they need it. A discovery command ranks skills by task description when the right playbook is not obvious.

</details>

#### Evidence before "done"

Building software is where an unsupervised agent most often reports success it has not actually earned, so coding work follows a planner, generator, evaluator pattern that keeps those roles in separate hands. Stuart frames the task and passes it to Wright, who agrees on acceptance criteria up front, sometimes has a swarm worker draft the tests first, and then implements against that contract. Before anything counts as finished, an automated suite produces objective evidence that it works, and a separate evaluator, Tess, reviews the result in a clean context against a fixed rubric, with no ability to edit what she is grading. She returns a pass or sends it back with specific findings. Completion rests on that evidence rather than an agent's own confidence.

#### The four pillars

**Security**, **Reliability**, **Precision**, and **Clarity** are the standing contract for how every agent behaves. Each maps to habits the cluster actually enforces, not ideals on a page.

<details>
<summary>The four pillars</summary>

**Security:** no secret leakage, narrow access, gated egress, no silent self-modification. Keys stay in Keychain; drafts get redacted before they leave home.

**Reliability:** bounded retries and timeouts, durable state where it matters, watchdog restarts for dead roles, incident mode when quality is not enough for the risk.

**Precision:** exactly the detail the task needs, nothing more. Short prompts, lean identity files, search memory before re-asking, delegate the minimum scope, no extra machinery when a simpler path works.

**Clarity:** explicit ownership, structured findings with references, logged governance transitions, and a fixed publication chain (draft, redaction, review, admin approval).

</details>

#### Operating over time

The cluster has a sense of what it should be doing right now and what it is working toward. Its posture shifts with the time of day, work that outlasts a conversation gets real project structure, and memory is condensed rather than dumped as it ages. Autonomy is opt-in throughout: background watching and scheduled sweeps stay off until I enable them, while ordinary interactive use is always available.

<details>
<summary>Modes, seasons, and drills</summary>

A mode is the cluster's current operating state, shaping how it routes requests, how patient it is, how cautious it is, and whether personality is allowed at all. Modes include an ordinary workday, a quiet overnight period for consolidating memory, and a security lockdown, among others. Seasons sit above modes as longer-term rhythms that schedule those states across each day, week, or month and hold the cluster to a scheduled spending limit. Together they let me decide how much independence the system has at any given time, instead of facing a single on-or-off switch.

To make sure the structure holds up under load, the cluster periodically runs drills at escalating cost, from free static checks up to full multi-agent exercises, to confirm that agents still hand off and recover the way they should.

</details>

<details>
<summary>Long-running work and memory</summary>

Some work is a project that runs for days, and that needs more structure than a chat thread. Ideas enter as proposals and move through a ledger with real states, from pending to approved, deferred, or rejected, after a review chain weighs them for duplication, priority, risk, cost, and governance before anyone spends effort. Approved proposals become projects with their own goals, milestones, and task lists. The larger or more irreversible the work, the higher its approval has to climb, ultimately to me for anything that cannot be undone. When that work touches shared code, it usually arrives as a GitHub pull request I merge or close.

Memory is tiered so that recent, relevant context stays close while older material is condensed rather than discarded. A nightly consolidation pass, run by Lucy, rolls older memories into summaries and records how much detail each one keeps, down to archive-only at the far end, with the cold archive itself behind a gate. That counters the slow decay that affects any long-lived agent, where context either grows without bound or quietly disappears.

</details>

#### Boundaries and visibility

Two things make the system safe to leave running: it is careful about what crosses the home boundary, and it is easy to watch while it works. External action carries the most risk, so it gets the most oversight, and nothing the cluster does is hidden from me.

<details>
<summary>Governance for anything that leaves home</summary>

When work needs to go beyond the home network, it passes through a governance loop first. Findings are validated, triaged, and adjudicated up the chain before anything is written externally, sensitive details are redacted on the way out, and every step is recorded. The cluster opens GitHub issues and pull requests when it is ready to act; I approve or reject them there.

</details>

<details>
<summary>Seeing what it does, from a portal and my editor</summary>

An observation portal renders the cluster's live state: its agents, projects, tasks, pending proposals, and governance queue. A single ledger records every LLM model call so any request can be followed from start to finish. The live aggregate view of all agent and cluster data is locked to the executive layer, so observability stays a window onto the system rather than a backdoor into everyone's context.

The same operations the agents use are exposed to my Cursor editor through MCP, so I can check status, hand off work, search memory, or summon a worker without leaving the place I already write code. A single configuration defines those commands, the agents' skills and rules, and the swarm roles together, which keeps the editor and the running cluster describing the same system.

</details>

#### Putting it together

The home cluster behaves like a small, accountable team rather than a single chatbot. It has clear roles and one point of contact, a split between rules, skills, and commands so agents pick the right mechanism for the job, cheap help for routine work, evidence before anything is called done, and named owners for every powerful tool. Context stays lean until it needs to be rich. Autonomy is something I dial up or down. Long work gets real process. Memory condenses instead of vanishing. And there is enough visibility to trust the whole thing while it runs.
