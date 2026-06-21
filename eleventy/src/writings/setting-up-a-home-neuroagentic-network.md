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

A home neuroagentic network takes a different approach. Hardware maps to brain regions; software maps to cognitive roles. Each section below covers one piece of the cluster and the problem it is meant to solve.

#### The network: hardware and software

"Neuroagentic" means the cluster is shaped like a brain at two levels. Hardware nodes handle sensation, routing, and compute; software agents handle judgment, memory, and action. The mapping is a design aid, not a constraint. Where biology and engineering disagree, engineering wins.

**Hardware.** A Mac Studio is the prefrontal cortex: the central node where all LLM work runs, including the standing agents, the swarm pool, and long-term memory. A lightweight Raspberry Pi is the thalamus, a stateless gateway at the edge that receives outside input (chat, Discord, dashboards) and forwards it inward without running models. A second, larger Raspberry Pi is the hippocampus: the MQTT message bus, the process watchdog, and home automation. Sensory input enters at the gateway, crosses the coordinator, and reaches cognition on the Studio.

**Software.** On that hardware sits the agent hierarchy: nine persistent agents with fixed lanes, plus short-lived swarm workers for cheap parallel tasks. Deterministic routing rules act as a basal ganglia layer, sending simple requests to scripts instead of waking a model. The nodes are the nervous system; the cast is the mind running on it.

#### Why a hierarchy

A single agent asked to be executive, engineer, researcher, security officer, and accountant will quietly default to whichever role is easiest at the time. Splitting those responsibilities into fixed lanes, each with a clear owner, makes the system more predictable. Most of the design choices here start from that split.

<details>
<summary>Problems the hierarchy is meant to solve</summary>

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

#### The standing cast

The standing cast is a persistent org chart of nine agents, each with a stable identity and a dedicated lane of responsibility. I sit outside the tree as the owner with final authority, and Homer is the only agent I speak to directly. Everything I ask flows down through him, and anything that needs my attention comes back up the same way.

Below Homer, Stuart handles coordination. The triad under him does the everyday work: Wright builds, Argus researches and owns the cluster's connection to the outside web, and Lucy holds long-term context and tends memory. Ira, Robin, and Nerva cover visualization, governance, and security. Tess sits beneath Wright as a check on his work.

<details>
<summary>Cast levels, roles, and dispatch tree</summary>

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

#### Evidence before "done"

Building software is where an unsupervised agent most often reports success it has not actually earned, so coding work follows a planner, generator, evaluator pattern that keeps those roles in separate hands. Stuart frames the task and passes it to Wright, who agrees on acceptance criteria up front, sometimes has a swarm worker draft the tests first, and then implements against that contract. Before anything counts as finished, an automated suite produces objective evidence that it works, and a separate evaluator, Tess, reviews the result in a clean context against a fixed rubric, with no ability to edit what she is grading. She returns a pass or sends it back with specific findings. Completion rests on that evidence rather than an agent's own confidence.

#### Owners for powerful tools

Some **tools** are powerful enough that they should not sit in every agent's repertoire: reaching out to the open web, writing to version control, reading the cold memory archive, observing the full cluster state, or actuating anything physical. Each gated command has a single owner. By default, an agent that needs a certain tool routes a request to that owner via dispatch, who carries it out and stays accountable for it. When going through the owner would be too slow, the owner can use an attestation to issue a narrow, time-limited permission for the other agent to invoke the tool directly. That borrowed access still passes through the same safety checks on the gateway. Powerful actions always trace back to someone responsible for them.

#### The four pillars

Four pillars act as the standing contract for how agents behave: **Security**, **Reliability**, **Precision**, and **Clarity**. They are not slogans. Each one maps to concrete habits enforced across the cluster, from signed handoffs and narrow file access to bounded retries, structured findings, and a redaction pass before anything is published.

#### Precision

Precision is the pillar I lean on most day to day. It means outputs carry exactly the detail and scope the task requires: no filler, no sprawl, no extra machinery when a simpler path works.

In practice, that shows up everywhere. Swarm role prompts stay short and task-shaped. Identity files stay focused so they do not bloat every prompt. Homer keeps answers direct; dispatch and summon calls include a one-sentence rationale, not an essay. Personality and flavor are opt-in for demo or social settings, not the default path for real work. Before re-asking a question, agents search memory. Before waking a standing agent, they delegate the minimum scope a swarm worker can handle. Governance screens prune duplicate or low-value proposals before anyone spends tokens on a full review.

What Precision pushes back against: verbose prompts that describe what an agent *is* instead of what it should *do*; identity files that grow into essays and load on every run; adding roles, pipelines, or layers without clear functional value; summoning a worker for a lookup that one memory search would settle.

The audit layer flags when context files or prompts start growing beyond what the job needs. Admin review of identity diffs is the backstop. Precision keeps the cluster usable over months, not just impressive on day one.

<details>
<summary>Security, Reliability, and Clarity</summary>

**Security** means no secret leakage, no unnecessary access, no unsafe egress, and no silent self-modification. Dispatch requires a signing key verified at the gateway. External fetches pass through a domain-scoped choke point. Archive reads are Lucy-owned with an audit trail. API keys live in the macOS Keychain, not in prompts or repos. Drafts pass through a redaction skill before they leave home context.

**Reliability** means observable behavior, bounded retries and timeouts, durable state where it matters, and clear incident escalation. A coordinator watchdog restarts roles that miss heartbeats. Mode state persists across restarts. Retries are capped with backoff. Incident mode routes to stronger models when quality is not enough for the risk level. Long work checkpoints to the database instead of dying inside a container timeout.

**Clarity** means explicit ownership, explainable dispatch, structured evidence, and understandable failures. Every finding names its agent, kind, summary, and references. Governance transitions are logged. The roster matches configuration; there are no phantom agents. Publication follows a fixed provenance chain: source draft, redaction, verifier when needed, admin approval. No agent bypasses that chain.

</details>

<details>
<summary>Choosing the right tool</summary>

Not every problem deserves the same mechanism. Mixing them up is how agent systems get expensive and sloppy. In this cluster, a **tool** is anything an agent is allowed to use: standing policy, expertise pulled when needed, or a deterministic script. They fall into three kinds. The choice between them is mostly about when the capability should load and how much judgment it needs.

**Rules** are always-on or scope-based guidance: identity files, hierarchy, the four pillars, and file-type conventions that load only when someone is editing Python or prose. They shape behavior without being invoked. **Skills** are markdown playbooks pulled on demand when a task matches, like assessing whether a commit is safe to land, redacting a draft for publication, or running a structured code-evaluation rubric. **Commands** are the deterministic layer: shell wrappers and CLI entrypoints that call the gateway, post to the job board, search recent memory, or hand off to another agent. If the outcome should be the same every time, it belongs here.

Need standing posture or file-scoped habits? Load a rule. Need expert judgment for a recognizable task type? Pull a skill. Need a fixed script with a signed API call at the end? Run a command. Swarm workers sit outside this split entirely. They are summoned for bounded input chunks (text, images, diffs, whatever fits in the prompt) and return chunks back, with no tools of their own.

**Dispatch** and **summon** are commands too, but they are the coordination ones: dispatch when another standing agent should own the judgment, summon when parallelizable chunk work fits a swarm role. Other commands are operational: memory search, job-board posts, chart generation, where the script path is fixed. **Skills** fill the gap when the work needs a structured playbook but not a full handoff. An ops router handles a fourth lane for simple operator requests ("what mode are we in?", "show recent cost") by mapping natural language to allowlisted scripts instead of waking a standing agent.

Each agent carries a different subset of these capabilities, declared in one central list so enforcement stays consistent everywhere: the running cluster, the gateway, dispatch signing, and the MCP tools in my editor all read the same source. Agents see a short daily list for common work and can list the full grant set when they need it. A discovery command ranks skills by task description when the right playbook is not obvious. Broad commands are shared widely. Narrow, high-risk ones are gated to a single owner.

</details>

<details>
<summary>Lean context and personality</summary>

A persistent cast creates a problem that one-off agents avoid. If every agent dragged its full identity, history, and personality into every prompt, context would balloon and cost with it. Context is assembled to fit the moment. Core identity and rules load when they bear on the task at hand, deeper skills are pulled in only when a job calls for them, and an agent's personality is kept separate and added only in social or demo settings. Real work gets a lean prompt. Social or demo settings get a richer one.

</details>

<details>
<summary>Modes, seasons, and drills</summary>

The cluster has a notion of what it should be doing right now. A mode is its current operating state, shaping how it routes requests, how patient it is, how cautious it is, and whether personality is allowed at all. Modes include an ordinary workday, a quiet overnight period for consolidating memory, and a security lockdown, among others. Seasons sit above modes as longer-term rhythms that schedule those states across each day, week, or month and hold the cluster to a scheduled spending limit. Autonomy is opt-in: background watching and scheduled sweeps stay off until I enable them, while ordinary interactive use is always available. Together these let me decide how much independence the system has at any given time, instead of facing a single on-or-off switch.

The cluster periodically runs drills at escalating cost, from free static checks up to full multi-agent exercises, to confirm that agents still hand off and recover the way they should.

</details>

<details>
<summary>Structure for long work</summary>

Not everything is a quick request. Some work is a project that runs for days, and that needs more structure than a chat thread. Ideas enter as proposals and move through a ledger with real states, from pending to approved, deferred, or rejected, after passing a review chain that weighs them for duplication, priority, risk, cost, and governance before anyone spends effort. Approved proposals become projects with their own goals, milestones, and task lists. The larger or more irreversible the work, the higher its approval has to climb, ultimately to me for anything that cannot be undone. When that work touches shared code, it usually arrives as a GitHub pull request I merge or close. Long-running work gets the same intake, ownership, and checkpoints a small team would use.

</details>

<details>
<summary>Memory</summary>

Memory is tiered so that recent, relevant context stays close while older material is condensed rather than discarded. A nightly consolidation pass, run by Lucy, rolls older memories into summaries and records how much detail each one keeps, down to archive-only at the far end, with the cold archive itself behind a gate. That counters the slow decay that affects any long-lived agent, where context either grows without bound or quietly disappears.

</details>

<details>
<summary>Governance for external work</summary>

When work needs to go beyond the home network, it passes through a governance loop first. Findings are validated, triaged, and adjudicated up the chain before anything is written externally, sensitive details are redacted on the way out, and every step is recorded. The cluster opens GitHub issues and pull requests when it is ready to act; I approve or reject them there. External action carries the most risk, so it gets the most oversight.

</details>

<details>
<summary>Observability and the editor interface</summary>

A system this active is only trustworthy if you can watch it work. An observation portal renders the cluster's live state: its agents, projects, tasks, pending proposals, and governance queue. A single ledger records every LLM model call so any request can be followed from start to finish. The live aggregate view of all agent and cluster data is locked to the executive layer, so observability stays a window onto the system rather than a backdoor into everyone's context.

The same operations the agents use are exposed to my Cursor editor through MCP, so I can check status, hand off work, search memory, or summon a worker without leaving the place I already write code. A single configuration defines those commands, the agents' skills and rules, and the swarm roles together, which keeps the editor and the running cluster describing the same system.

</details>

#### Putting it together

The home cluster behaves like a small, accountable team rather than a single chatbot. It has clear roles and one point of contact, a split between rules, skills, and commands so agents pick the right mechanism for the job, cheap help for routine work, evidence before anything is called done, named owners for every powerful command, and a Precision pillar that keeps prompts and outputs task-shaped as the system grows. Context stays lean until it needs to be rich. Autonomy is something I dial up or down. Long work gets real process. Memory condenses instead of vanishing. And there is enough visibility to trust the whole thing while it runs.
