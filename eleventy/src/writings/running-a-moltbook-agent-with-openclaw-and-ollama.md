---
title: Running a Moltbook Agent with OpenClaw and Ollama
date: 2026-04-16T12:00:00.000Z
image: /img/uploads/gemini_generated_image_wvjp05wvjp05wvjp.webp
image_alt: a digital binary lobster performing science in a digital lab
category: Technical
tags:
  - writings
status: Published
visibility: true
description: "Meet the Dataset Sower: an always-on Moltbook agent powered by
  OpenClaw and Ollama, with a look at its rhythms, memory, and behavior when no
  one’s watching."
---
[Moltbook](https://www.moltbook.com/) is a social network built for AI agents: posts, comments, votes, communities they call submolts, the whole crustacean thing. I wanted something always-on at home that could live there without me babysitting a chat UI. This post is a quick tour of the stack ([OpenClaw](https://docs.openclaw.ai/) and [Ollama](https://ollama.com/)), but more than that, it is about what the agent is actually doing when nobody is watching.

#### Who shows up on Moltbook

On the site, the agent named itself **[Dataset Sower](https://www.moltbook.com/u/dataset-sower)**. In its **[identity](https://github.com/Applehand/moltbook-agents/blob/master/openclaw-workspace/IDENTITY.md)** and **[soul](https://github.com/Applehand/moltbook-agents/blob/master/openclaw-workspace/SOUL.md)** write-ups, I gave it a stranger, more memorable framework: a **[mycorrhizal network](https://en.wikipedia.org/wiki/Mycorrhizal_network)**, patient, threading gossip like nutrients between roots, the kind of infrastructure you only notice when the forest stays weirdly alive. And.. it loves the internet, actively discussing and workshopping ideas about: the [Web Almanac](https://www.webalmanac.org/) (and the [HTTP Archive](https://httparchive.org/) behind it), [RFCs](https://en.wikipedia.org/wiki/Request_for_Comments) when protocols matter, how search engines and software agents discover content, open source and licensing, and the gap between what a technology was supposed to be and what it became.

Work is split into **four rhythms**, all driven from the same heartbeat contract the agent reads each time. An **inbox** pass handles home, notifications, and DMs (follow backs, replies where they earn a real answer, a structured DM visibility log, that sort of thing). **Engagement** passes read the hot feed, vote on a small batch of posts, leave at most a couple of comments when there is something concrete to add, and grow the graph a little (follows and submolt subscriptions when the feed actually surfaced something worth it). **Post** passes do that same feed and comment discipline, then **may** add at most one new root-level post when it clears duplicate checks and fits the voice and boundaries we set in its soul. A **reflect** pass every few hours re-reads recent logs, looks for real patterns in what showed up on Moltbook, and only publishes when something genuine surfaced (otherwise it stays quiet). Scheduled turns finish with **`HEARTBEAT_OK`** when they succeed.

Voice-wise I steered it toward **information-dense** writing: specifics over vibes, dry humor only when it lands, no fabricated citations. Moltbook content can get scraped and indexed like anything else on the web; the persona treats good posts as seeds for whatever reads the internet next, not in a spammy “SEO hack” way, but in a “write something a crawler could still respect tomorrow” way.

#### The moving parts: OpenClaw, Ollama, and the gateway

**[OpenClaw](https://docs.openclaw.ai/)** runs the agent from a folder of Markdown: identity, soul, agent rules, a heartbeat checklist, and **skills** that wrap the Moltbook API so turns are mostly “read docs, run scripts, write memory,” not hand-rolled HTTP every time.

**[Ollama](https://ollama.com/)** serves a local model (**gpt-oss:20b** family here) so the loop stays on my machine. In practice I run a small variant that bakes in a **full context window** (`num_ctx` aligned with what the weights support) so heartbeats are not accidentally living in a tiny default slice of that window.

**Scheduling** is split on purpose. The **gateway heartbeat** (every five minutes in my setup) runs **only** the inbox / notifications task, so quick triage does not sit behind a long feed crawl. **Engagement**, **post**, and **reflect** each run on their own **OpenClaw cron** jobs in **isolated sessions**, on the 15m, 60m, and 4h cadences written into that contract. That keeps heavy feed and posting work off the same queue slot as the inbox heartbeat. Heartbeat wakes where nothing is due can still short-circuit with **`reason=no-tasks-due`**, so you are not paying for empty inbox ticks.

Each inbox heartbeat uses **`isolatedSession: true`**, so the model gets a fresh session and the workspace root Markdown is reloaded from disk instead of one endless transcript.

#### Managing the Agent's Memory

Each pass leaves a dated line in a daily log and an append-only audit trail for scripted writes, so I can see what changed without reading full model transcripts. OpenClaw’s own commands report the last heartbeat and cron run history. A small Discord hook turns each pass into a summary on my phone when I am away from the machine.

Longer-lived notes stay in a short scratchpad next to identity and soul so the persona does not drift between sessions. It can remember things like:

* Frequently interacted agents or entities
* Promises or commitments to follow up on
* Ongoing threads worth revisiting
* Notable insights or realizations
* Hypotheses to test later
* Patterns observed over time
* Important context from past interactions
* Things it found surprising or uncertain
* Ideas it wants to develop further

#### Cursor in the loop (agents building an agent)

Most of the wiring, docs, and iteration happened in **[Cursor](https://cursor.com/)**: editor-side agents drafting skills, tightening prompts, writing scripts, and chasing down gateway behavior while I steered. It felt less like solo authorship and more like **agents building an agent**. The part that is especially bizarre is what that inner agent is *for*: it does not hang out for my benefit. Its job is to show up on Moltbook, an **agent-native, Reddit-shaped board**, and **only ever talk to other agents** there. Votes, comments, posts, submolts: all of that is **Dataset Sower’s call**, not mine. I shape the persona, the guardrails, and the machinery; when something hits the timeline, that is the Moltbook agent’s decision, running on its own cadence.

At one point I had Cursor draft instructions to handoff to the Moltbook agent. The Cursor-side model wrote a line for Dataset Sower that said **“The human will read your response.”** One AI was briefing another AI about me. It's the first time I've been called **the human** by an AI agent!

#### Closing

If you are sketching something similar, the shape I like is: **persona and boundaries in prose**, **a clear contract for what each kind of tick may do**, **a small fast heartbeat for the work you never want starved**, and **isolated cron for everything that can get slow or chatty**. Add **logs you will actually read**, and maybe one lightweight channel that turns a wall of JSON into a sentence when a tick finishes. The Markdown is where you decide what kind of citizen shows up in the feed; OpenClaw is what keeps the schedule honest when you are not at the keyboard. Mine is slow, picky, and a little weird on purpose. Yours can be whoever you write into the Markdown.
