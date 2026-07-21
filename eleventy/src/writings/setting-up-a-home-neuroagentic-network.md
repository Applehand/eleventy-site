---
title: Setting Up a Home Neuroagentic Network
date: 2026-06-20T22:49:00.000-05:00
image: /img/uploads/agentic-brain.jpg
image_alt: a stylized brain with segments depicting an ai agent hierarchy of roles
category: Technical
tags:
  - writings
status: Published
visibility: true
description: A multi-node home agent cluster — standing cast and swarm workers,
  an MQTT data spine, hybrid memory with a fidelity ladder, gated tools, and
  the loops that keep cost, governance, and human judgment in the loop.
---
Most agent setups collapse into a single chat window with one personality and one set of tools. That works for a demo. Over a longer run, the context window fills with history that no longer matters, tools fire without oversight, costs climb, and it gets hard to say which decision came from where.

This cluster is built to avoid those failure modes. Hardware maps to brain regions and software maps to cognitive roles. Placement is configuration, not a rewrite. Each section below covers one piece of the system and the problem it is meant to solve. What follows reflects Phase 1 as it runs today: cognition on a MacBook, the data spine on a 16GB Pi, the edge on a 4GB Pi, with a Mac Studio still on the roadmap.

#### The network: hardware and software

"Neuroagentic" means the cluster is shaped like a brain at two levels. Hardware nodes handle sensation, routing, and durable state; software agents handle judgment, memory work, and action. The mapping is a design aid, not a constraint. Where biology and engineering disagree, engineering wins.

Two policies govern the whole thing. **Cognition is centralized** — the Pis stay inference-free so they never starve the broker or burn flash running models. **One config places every role** — moving a process from MacBook to Mac Studio later is a `cluster.yaml` change, not a redesign.

**Hardware (Phase 1).** A MacBook Pro is the interim prefrontal cortex: Nanoclaw hosts the standing agents and swarm pool, plus the gateway HTTP shim that containerized agents call for memory, fetch, and summon. A 4GB Raspberry Pi (`smolpi`) is the thalamus — Discord relay and observation portal at the edge, stateless, no models, no durable queues. A 16GB Pi with NVMe (`bigpi`) is the hippocampus — Mosquitto MQTT broker, warm memory service, governance daemon, and process watchdog. An Internet-in-a-Box Pi Zero (`iiab`) sits beside the cluster as a read-only offline knowledge appliance (Kiwix); agents query it through a gated gateway path rather than treating it as a cluster node. A Mac Studio is planned as the long-term cortex and cold-archive host; it is not live yet. Home automation on bigpi is deferred the same way.

**Software.** On that hardware sits the agent hierarchy: nine persistent agents with fixed lanes, plus short-lived swarm workers for cheap parallel tasks. Deterministic routing rules act as a basal ganglia layer, sending simple operator requests to scripts instead of waking a model. The nodes are the nervous system; the cast is the mind running on it.

```
Edge / data                    Cognition (Phase 1)
───────────                    ───────────────────
smolpi (Thalamus)              MacBook (Cortex)
  Discord relay                  Nanoclaw + standing cast
  observation portal             swarm pool
                                 gateway shim
bigpi (Hippocampus)
  Mosquitto broker        ◀──MQTT──▶
  warm memory (SQLite)
  governance + watchdog

iiab (offline Kiwix) ──gated──▶ shim /knowledge

Phase 3: Mac Studio takes cortex (+ cold archive); MacBook returns to cockpit-only
```

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
| Stale memory           | Nightly consolidation that demotes fidelity on a ladder instead of dropping context                                                                                |
| Runaway autonomy       | Modes and seasons that scope how independent the system is                                                                                                         |
| Judgment outside code  | Human task requests for eyes-on checks, physical verification, and calls only a person can make                                                                    |
| Stagnant harness       | Self-improvement loop that mines failure patterns, proposes small edits, and validates them before opening a PR                                                    |

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

Keeping the ways agents talk to each other distinct makes the system easier to follow. A dispatch is a blocking, signed handoff from one standing agent to another, used whenever a task needs real judgment or coordination. A summon is a lighter, one-shot call down to a swarm worker for bounded work on a chunk of material: reading a document, summarizing a thread, reviewing a screenshot, or drafting tests. For anything that should outlive a single conversation, agents post findings to a shared workspace and pick up tasks from a job board, so long work can proceed in the background instead of living inside one chat thread. Some questions only I can answer: whether a device looks right, whether a safety call is warranted, whether the real world matches what the logs say. For those, a standing agent posts a **human task request**. I pick it up from a unified inbox, leave a verdict, and the agent continues from there. Agents can also ask each other read-only questions without handing off any work. Every path is signed and checked against policy, so the system always knows who asked for what and whether they were allowed to.

The swarm sits apart from all of this on purpose. Its workers are cheap, stateless, and have no tools of their own; they take chunks in and return chunks out, and a standing agent decides what to do with the result. That keeps the cost of routine parallel work low and the surface for mistakes small.

#### The data spine

Agent chat is not the system of record. Durable state lives on a hub-and-spoke spine, and the spokes are honest about that. Mosquitto on bigpi carries structured messages over a Tailscale mesh — no public ports, stable hostnames, WireGuard under the hood. Topics cover heartbeats, task assign/delivery, mode state, ledger sync, and memory notifications. Payloads are JSON **references** (content hash plus location), not embeddings or blobs; receivers fetch bulk data out of band. Task traffic uses QoS 1 with application-level dedupe by task ID. Memory notifications use QoS 1 plus idempotent upserts keyed by content hash, because transport "exactly once" does not give you application idempotency.

Earlier drafts tried to keep authoritative copies in more than one place. The pilot produced four node-locality split-brains in a single day. The fix was a hard rule: every durable record has exactly one authority, and it lives on bigpi. Cognition keeps working buffers; the hippocampus keeps the record.

<details>
<summary>What lives where</summary>

| Record | Authority | Elsewhere |
| ------ | --------- | --------- |
| Memory (facts, findings, board, human tasks) | bigpi `memory.db` via HTTP memory service | Remote clients only |
| LLM cost ledger | bigpi aggregate | Local write buffer for metering; sync over MQTT in batches |
| Mode / season state | coordinator | Mirrors on other nodes with hold/preemption guards |
| Project files | Working trees next to the executor | Spine holds a registry snapshot in memory |

The cortex metaphor still helps: keep working state close to the model, keep the durable index on the always-on NVMe node.

</details>

#### Memory as a pipeline

Session chat is short-lived. Long-lived knowledge goes through a write → search → demote → (sometimes) spill path.

The warm store is one SQLite database on bigpi with three views of the same rows: the memory table itself, an FTS5 BM25 index, and a sqlite-vec embedding index. Search fuses keyword and vector hits with reciprocal-rank fusion, applies a confidence floor and recency decay, and excludes tombstones and refuted rows. Roles on other machines talk to the same API over HTTP.

Forgetting is intentional. Every memory starts at fidelity **L0** (full episodic detail) and only ever demotes, one step per dream pass, after a minimum age at that level. L1→L2 is an LLM condense to a few sentences; L2→L3 is an LLM gist to one sentence; later steps are bookkeeping until an L5 tombstone drops the row from both indexes. Lucy owns the consolidation cadence. Before any content-rewriting demotion, the original text is logged so a bad condensation can be restored. Memories tagged to an active or parked project are protected until the project closes.

Cold archive is a separate path. Dreaming does not move rows off-box. Spill only runs under disk pressure on the coordinator volume, and even then only the oldest faded rows. Archive search is gated to Lucy the same way open-web fetch is gated to Argus.

<details>
<summary>Fidelity ladder at a glance</summary>

| Level | Meaning | What demotion does |
| ----- | ------- | ------------------ |
| L0 | Full episodic record | Marker only → L1 |
| L1 | Aging episodic | LLM condense → L2 |
| L2 | Condensed facts/decisions | LLM gist → L3 |
| L3 | Single-sentence gist | Marker only → L4 |
| L4 | Faded | Tombstone → L5 |
| L5 | Tombstone | Dropped from indexes; row kept as marker |

Refutation marks a row excluded from search without silently rewriting history. Supersession writes a replacement and refutes the old one.

</details>

#### Tools and access

Agents do not all get the same capabilities. A **tool** here is anything an agent may use, and tools come in three kinds: **rules** (always-on or scope-based guidance), **skills** (playbooks pulled on demand), and **commands** (deterministic scripts and handoffs). Which kind fits depends on when it should load and how much judgment it needs.

Context works the same way. Each markdown layer declares when it should load: core identity always, dispatch guidance only for agents that hand off work, personality only when the current mode allows it, file-type rules when the task matches. A context manifest resolves that ordered list at sync time and assembles one prompt per agent. Skills stay out until invoked. Real work gets a lean default; richer layers load only when the situation calls for them.

A few commands are powerful enough that they should not sit in every agent's hands: reaching out to the open web, writing to version control, reading the cold memory archive, querying offline knowledge, observing the full cluster state, or actuating anything physical. Each of those is gated to a single owner. Another agent that needs one routes a request to that owner, or borrows a narrow, time-limited attestation that still passes the same safety checks on the gateway — allowlists, SSRF guards, and mount scopes included. Powerful actions always trace back to someone responsible for them.

<details>
<summary>The three kinds of tools, in detail</summary>

**Rules** are always-on or scope-based guidance: identity files, hierarchy, the four pillars, and file-type conventions that load only when someone is editing Python or prose. They shape behavior without being invoked. **Skills** are markdown playbooks pulled on demand when a task matches, like assessing whether a commit is safe to land, redacting a draft for publication, or running a structured code-evaluation rubric. **Commands** are the deterministic layer: shell wrappers and CLI entrypoints that call the gateway, post to the job board, search recent memory, or hand off to another agent. If the outcome should be the same every time, it belongs here.

Need standing posture or file-scoped habits? Load a rule. Need expert judgment for a recognizable task type? Pull a skill. Need a fixed script with a signed API call at the end? Run a command. Swarm workers sit outside this split entirely. They are summoned for bounded input chunks (text, images, diffs, whatever fits in the prompt) and return chunks back, with no tools of their own.

**Dispatch** and **summon** are commands too, but they are the coordination ones: dispatch when another standing agent should own the judgment, summon when parallelizable chunk work fits a swarm role. Other commands are operational: memory search, job-board posts, chart generation, where the script path is fixed. An ops router handles a fourth lane for simple operator requests ("what mode are we in?", "show recent cost") by mapping natural language to allowlisted scripts instead of waking a standing agent.

Each agent carries a different subset of these capabilities, declared in one central list so enforcement stays consistent everywhere: the running cluster, the gateway, dispatch signing, and the MCP tools in my editor all read the same source. Agents see a short daily list for common work and can list the full grant set when they need it. A discovery command ranks skills by task description when the right playbook is not obvious.

</details>

#### Evidence before "done"

Building software is where an unsupervised agent most often reports success it has not actually earned, so coding work follows a planner, generator, evaluator pattern that keeps those roles in separate hands. Stuart frames the task and passes it to Wright, who agrees on acceptance criteria up front, sometimes has a swarm worker draft the tests first, and then implements against that contract. Before anything counts as finished, an automated suite produces objective evidence that it works, and a separate evaluator, Tess, reviews the result in a clean context against a fixed rubric, with no ability to edit what she is grading. She returns a pass or sends it back with specific findings. Completion rests on that evidence rather than an agent's own confidence.

#### Routing, cost, and autonomy

Not every request deserves a standing agent, and not every standing task deserves the expensive model. Provider routing is configuration: cortex calls go through an abstracted path so swapping backends is an env change, not a rewrite. Mode-aware routes pick cheaper tiers for routine work. An ops router short-circuits status and budget questions to allowlisted scripts. Swarm workers absorb chunk parallel work so the cast stays free for judgment.

Cost has a hard envelope. Every model call lands in a ledger that syncs to the spine. A rolling weekly budget can trip a circuit-breaker that prefers local or cheaper routes until spend cools off. Seasons schedule modes across the day and week — ordinary workday, overnight consolidation, security lockdown among them — so autonomy is a dial, not a binary switch. Background watching and scheduled sweeps stay off until I enable them; interactive use is always available.

Drills sit on top of that posture: free static checks first, then low-cost probes, then opt-in full multi-agent exercises, so the hierarchy still hand off and recover the way it should.

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

The cluster has a sense of what it should be doing right now and what it is working toward. Its posture shifts with modes and seasons (covered above). Work that outlasts a conversation gets real project structure. Memory condenses on the fidelity ladder rather than growing without bound or vanishing. Autonomy stays opt-in for background loops.

<details>
<summary>Long-running work</summary>

Some work is a project that runs for days, and that needs more structure than a chat thread. Ideas enter as proposals and move through a ledger with real states, from pending to approved, deferred, or rejected, after a review chain weighs them for duplication, priority, risk, cost, and governance before anyone spends effort. Approved proposals become projects with their own goals, milestones, and task lists. The larger or more irreversible the work, the higher its approval has to climb, ultimately to me for anything that cannot be undone. When that work touches shared code, it usually arrives as a GitHub pull request I merge or close. Project files live next to the executor; project decisions and task lifecycle events live as tagged memories on the spine.

</details>

<details>
<summary>Harness self-improvement</summary>

The cluster can propose edits to its own harness: prompts, skills, rules, and configuration. Nothing applies on its own. Each suggestion enters a gated loop and stays a draft until I merge it.

First, a deterministic mining pass groups recurring failures from audit logs (dispatch retries, verify failures, watchdog restarts, and the like). That step uses no LLM calls. From those clusters the system drafts small edits, one surface at a time, each tagged with an expected effect and a regression risk.

Before anything ships, a regression gate runs the proposal in an isolated worktree: config validation, doc coherence, lint, plus whatever check the proposer says should improve. Old passing checks have to keep passing. The targeted check has to actually get better. Accepted candidates open a pull request through the same governance path as any other external write. Rejected ones get logged and the live harness stays as-is. I can opt into a weekly cadence via self-improvement mode, or kick off a round by hand whenever I want.

</details>

#### Boundaries and visibility

Two things make the system safe to leave running: it is careful about what crosses the home boundary, and it is easy to watch while it works. External action carries the most risk, so it gets the most oversight, and nothing the cluster does is hidden from me.

<details>
<summary>Governance for anything that leaves home</summary>

When work needs to go beyond the home network, it passes through a governance loop first. Findings are validated, triaged, and adjudicated up the chain before anything is written externally, sensitive details are redacted on the way out, and every step is recorded. The cluster opens GitHub issues and pull requests when it is ready to act; I approve or reject them there. Offline knowledge on iiab is the complementary path: research against a local corpus without opening the web, still Argus-gated at the shim.

</details>

<details>
<summary>When agents need a human call</summary>

Some stalls have nothing to do with code. An agent may need my judgment on a tradeoff, a walk-through of something physical, or confirmation that a sensor reading matches what I see. That goes through the human task layer, alongside governance intake and any future home actuation, but on its own track.

A standing agent posts a `human_task_request` with a plain-language prompt, a category (`judgment`, `physical`, or `observation`), and an urgency level. Routine items show up in a unified portal inbox at `/human`. Blocking or incident-level items also land in Discord so I do not have to poll for them. When Stuart's governance triage recommends `request_human_decision`, the system creates a linked human task with the same ID, so escalations and direct asks share one inbox.

I resolve from the portal, CLI, or a linked GitHub issue: approve, reject, defer, or mark done with notes and optional evidence refs. That posts a `human_task_done` finding and publishes a resolution event so the requesting agent can pick up where it left off. Repo fixes and PRs still go through Robin. Actuation with a grant still goes through Nerva. Human tasks are for the cases in between, where asking me is the right move.

</details>

<details>
<summary>Seeing what it does, from a portal and my editor</summary>

An observation portal renders the cluster's live state: its agents, projects, tasks, pending proposals, governance queue, season and budget posture, and open human tasks. A single ledger records every LLM model call so any request can be followed from start to finish. The live aggregate view of all agent and cluster data is locked to the executive layer, so I can see what is happening without opening every agent's private context.

The same operations the agents use are exposed to my Cursor editor through MCP, so I can check status, hand off work, search memory, or summon a worker without leaving the place I already write code. A single configuration defines those commands, the agents' skills and rules, and the swarm roles together, which keeps the editor and the running cluster describing the same system.

</details>

#### Putting it together

The home cluster is a small, accountable team sitting on a real data pipeline. Clear roles and one point of contact. A split between rules, skills, and commands so agents pick the right mechanism. Cheap swarm help for routine chunks. Evidence before anything is called done. Named owners — and time-limited attestations — for every powerful tool. An MQTT spine that carries references, not blobs, with one authoritative store after split-brain taught its lesson. Hybrid memory that searches well and forgets on purpose. Cost and mode controls that make autonomy a dial. Formal human asks when only a person can decide. A regression-gated loop when the harness itself needs a tune-up.

What matters most to me is demonstrating how information architecture, tracking, provenance, retrieval, and collaborative multi-agent control all work together. The brain analogy is my way of explaining the system, but it’s the underlying engineering that keeps it reliable in practice.
