---
title: Setting Up a Home Neuroagentic Network
date: 2026-06-14T18:00:00.000Z
category: Technical
tags:
  - writings
status: Draft
visibility: false
description: A home agent cluster built around a standing cast, a cheap swarm,
  and shared infrastructure for routing, memory, and governance.
---
Most agent setups collapse into one chat window with one personality and one tool belt. That works for demos. Longer runs bloat context, leave tools unsupervised, run up costs, and blur accountability.

A **home neuroagentic network** is a small organization of persistent agents plus short-lived workers, connected by signed handoffs and a shared message bus.

#### Why hierarchy

One super-agent plays executive, engineer, researcher, security officer, and bookkeeper at once. It picks whichever role is easiest. Fixed **lanes** with clear owners make behavior predictable:

| Problem | Response |
|---------|----------|
| Role confusion | One lane per standing agent (build, research, governance, security, etc.) |
| Ungoverned tools | **Gatekeepers** own dangerous capabilities; others dispatch the owner or borrow via scoped **attestation** |
| Context bloat | **Conditional loading**: identity, rules, and flavor load only when their conditions match |
| Cost runaway | **Swarm** on cheap models; standing agents on heavier routes; **budget envelope** and mode caps |
| Premature "done" | Deterministic checks, then a separate grader in a clean context |
| Weak accountability | **Signed dispatch**; governance transitions logged to memory |
| Chat as only queue | **Workspace**, **job board**, and **project registry** for async work |
| Stale memory | **Dream** consolidation into rated summaries; cold archive behind Lucy |
| Runaway autonomy | **Modes**, **seasons**, and opt-in **autonomy** |
| IDE vs runtime gap | Cluster MCP exposes the same operations the agents use |

The "neuro" is a loose metaphor: agents map to brain functions like attention, memory, and reflection. It is only a naming aid.

#### The standing cast: nine agents

The **standing cast** is a persistent org chart. Each agent has stable identity, a dispatch scope, and a lane. They **dispatch** along the tree, **summon** swarm workers for small jobs, or ask peers read-only questions.

I sit outside this tree. I'm the owner and final authority. **Homer** is the only standing agent I talk to; every other agent routes admin questions through him.

| Level | Who | Role |
|-------|-----|------|
| 1: Executive | Homer | My interface to the cluster; dispatch: all |
| 2: Upper management | Stuart | Team coordination; dispatch: team |
| 3: Triad | Wright, Argus, Lucy | Build, research, reflection |
| 4: Specialists | Ira, Robin, Nerva | Visualization, governance, security |
| 5: Subordinates | Tess | Build evaluator under Wright |
| (outside tree) | Swarm | reader, reviewer, summarizer, … one-shot workers |

```
Jake (owner, human, outside the cast)
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

Swarm pool ── summon ──▶ reader · reviewer · summarizer · test author · …
         ▲
         └── invoked by standing cast; outside the tree
```

**Stuart** owns arbitration, reliability, the portfolio, and the job board. Wright, Argus, Lucy, Ira, Robin, and Nerva report to Stuart.

**The Triad** runs daily work: Wright builds, Argus researches and controls outbound web access, Lucy holds long-term context and runs memory consolidation.

**Specialists** hold gated domains: Ira for charts and the observation UI, Robin for governance and version control, Nerva for security monitoring and home actuation.

**Tess** reports to Wright. She grades deliverables in a separate context against a fixed rubric, read-only, with no write access. Wright builds; Tess returns pass or needs-work. Shared library promotion uses the same gate.

#### Three ways to move work

1. **Dispatch**: blocking, signed handoff between standing agents. Policy-checked. For judgment and orchestration.
2. **Summon**: one-shot swarm call for parallel text work (read, summarize, classify, draft tests). Stateless, cheap, outside the tree.
3. **Workspace + job board**: async work. Agents post **findings**; the **job board** routes requests, claims, and completions.

Agents can also ask each other read-only questions (Wright checking a fact with Argus). These stay signed and policy-checked, but hand off no work.

Swarm agents stay outside the tree, cannot summon each other, and do not use MCP. They take text in and return text out; a standing agent handles the results.

#### The build loop

Coding work uses **Planner, Generator, Evaluator**:

1. Stuart dispatches the build task to Wright.
2. Wright sets acceptance criteria and may summon a test-author swarm role first.
3. Wright implements and runs verification: tests, lint, type-check, build. Output is a machine-readable report.
4. Wright dispatches Tess to grade against the contract.
5. Tess returns pass or needs-work. Needs-work goes back to Wright with findings.

Stuart plans at portfolio scale. Tess checks the artifact. Closure requires a green report and a Tess pass.

#### Gatekeepers and attestation

Dangerous capabilities have named owners. Default: dispatch the owner. **Attestation** grants a time-limited borrow without dropping guardrails.

| Capability | Owner | Use |
|------------|-------|-----|
| External fetch | Argus | Outbound web access and research |
| Cold memory search | Lucy | Archived context |
| Version control writes | Robin | Shared infrastructure mutation |
| Home actuation | Nerva | Physical automation |

Inbound MCP calls use the same proxy as external fetch. Swarm agents do not use MCP.

Four **pillars** (Security, Reliability, Pithiness, Clarity) guide enforcement: signed dispatch, narrow file access, bounded retries, mode-aware timeouts, and redaction before anything is published.

#### Context and flavor

Context is layered:

- **Rules** (identity, pillars, hierarchy) load at startup or when conditions match (file type, mode, role).
- **Skills** load on demand when the task fits.
- **Commands** are explicit deterministic workflows.

Identity and personality are separate files. Personality loads only when a global switch, the current mode, and the agent's own opt-in all agree. The build step checks these conditions and assembles a short prompt for normal work, a fuller one for showcase or off-hours modes.

**Flavor** stays off during production. Character appears in social or demo modes. Dispatch-auth context loads for dispatchers only; specialist guidance for specialists and peers. Mode changes re-sync the layers.

Production prompts stay short. Optional layers attach when the mode allows them.

#### Modes, seasons, and lifecycle

| Knob | Scope | Controls |
|------|-------|----------|
| **Mode** | Runtime state | Routing, timeouts, autonomy, flavor |
| **Season** | Month profile | Scheduled modes, weekly budget |
| **Flavor** | Personality | Whether character prose injects |

**Modes** include workday, development, hibernate, incident, dream, happy hour, showcase, watch, maintenance, self-improvement, prefer local, high alert, and lockdown. Incident, security, and maintenance modes cannot be preempted by the schedule. After an idle timeout the cluster can enter hibernate; the next message from me wakes it.

**Seasons** (steady, caretaker, focus, away) set daily rhythm: work windows, memory consolidation, low footprint, local models. A weekly spending limit can force prefer local when the cluster gets close to it.

**Autonomy** starts off. Background watches and scheduled sweeps stay disabled until I enable them. Interactive use, chat, dispatch, and summon, is always on.

**Drills** run at three cost tiers, from free static checks up to full multi-agent exercises, to confirm the hierarchy and handoffs still work.

#### Projects, proposals, and the job board

**Proposals** move through a ledger: pending, assessed, approved, deferred, rejected. Review runs in order: a free screen for duplicates, Stuart, a reviewer matched to the work, Nerva for risk and cost, Robin when code or publishing is involved, and Homer for final sign-off. Higher tiers need higher approval, up to me for anything irreversible.

Approved proposals become **projects** with their own workspace, goals, milestone gates, and todos. Stuart owns the portfolio; Wright builds; Tess gates quality; Robin owns the path into shared infrastructure.

The **job board** routes tasks inside projects. The **workspace** holds findings, flags, and governance candidates. Because this state is shared, work survives across sessions and restarts.

#### Memory

Memory is tiered:

- **Warm**: full-text plus vector search for recent context.
- **Consolidation**: Lucy's dream pass compresses older memories into summaries, each tagged with how much detail it keeps, from full down to archive-only.
- **Cold archive**: Lucy's gate; old context goes through her lane.
- **Identity review**: periodic proposed identity updates, human-approved.

When the cluster spans machines, only small references cross the bus, and repeated updates are safe to apply.

#### Governance

Robin validates findings, Stuart triages, Homer adjudicates, then the cluster may open issues or pull requests. Transitions log to memory. Argus redacts before publication. Robin owns version control writes.

#### Observability

The cluster exposes heartbeats, mode, memories, projects, todos, job board, proposals, governance queue, audit snapshots, and a log of model calls. A read-only **observation portal** renders it; a structured API feeds the UI.

Wright and Ira build the portal on **synthetic fixtures** (fake agents, invented memories). Live aggregate data is Homer-only.

A single **ledger** records every model call with a trace ID, so any request can be followed end to end. Audit snapshots bundle health, cost, memory, governance, and device state.

#### Cluster MCP

**Outbound**: MCP tools that let the IDE check status, dispatch, search memory, summon swarm workers, and read the job board. Skills become MCP resources; commands become MCP tools.

**Inbound**: standing agents call allowlisted MCP servers through the same proxy as external fetch.

One configuration file drives the MCP tools, the command list, and the swarm roles, so the IDE and the running cluster stay in step.

#### Summary

A home cluster organized like a small team:

- **Standing cast** with fixed lanes and one admin interface.
- **Swarm** for cheap parallel text work, with no tools and outside the tree.
- **Dispatch, summon, workspace** for blocking handoffs, parallel subtasks, and async queues.
- **Gatekeepers, attestation, pillars** for owned dangerous tools.
- **Conditional context and flavor** for short production prompts.
- **Modes and seasons** for time-of-day, budget, and security posture.
- **Projects, proposals, governance** for long work and external writes.
- **Memory consolidation and observability** for audit and improvement.
