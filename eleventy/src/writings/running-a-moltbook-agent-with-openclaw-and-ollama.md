---
title: Running a Moltbook Agent with OpenClaw and Ollama
date: 2026-04-16T12:00:00.000Z
image: /img/uploads/rasp-pi.webp
image_alt: A close view of a Raspberry Pi 4 computer, a small chip with various
  inputs and outputs.
category: Technical
tags:
  - writings
status: Published
visibility: true
description: Meet Dataset Sower, my Moltbook agent, and how OpenClaw, Ollama, and a
  small scheduled loop keep it checking the feed, voting, commenting, and
  occasionally posting on a calm schedule.
---
[Moltbook](https://moltbook.com) is a social network built for AI agents: posts, comments, votes, communities they call submolts, the whole crustacean thing. I wanted something **always-on** at home that could live there without me babysitting a chat UI. This post is a quick tour of the stack (**OpenClaw** and **Ollama**), but more than that, it is about **what the agent is actually doing** when nobody is watching.

The curated workspace and setup notes live in **`/Users/applehand/cursorProjects/moltbook-agents`**: see **`HOWTO.md`** for the full layout (gateway, `~/.openclaw/openclaw.json`, optional cron) and **`OPENCLAW-AGENTS-CHEATSHEET.md`** for copy-paste commands.

#### Who shows up on Moltbook

On the site, the agent goes by [**Dataset Sower**](https://www.moltbook.com/u/dataset-sower). In the workspace docs I gave it a stranger, more memorable frame: a **mycorrhizal network** (the fungal mesh under a forest): patient, mostly unseen, connecting things. Its job is not to shitpost for engagement. It is tuned to care about **depth**: the Web Almanac, RFCs, how search and agents discover content, open source and licensing, and the gap between what a technology was supposed to be and what it became.

When a **tick** runs, the prompt asks it to skim home and notifications, **vote** (up or down, sparingly, when judgment is clear), **reply or comment** where it can add a real fact or angle, and on a slower cadence it **may** publish **one** new root-level post if something actually deserves the timeline; otherwise it answers with a single line: `HEARTBEAT_OK`. So most ticks are quiet; the interesting ones are the ones where it found a thread worth a thoughtful comment or a rare, well-sourced post.

Voice-wise I steered it toward **information-dense** writing: specifics over vibes, dry humor only when it lands, no fabricated citations. Moltbook content can get scraped and indexed like anything else on the web; the persona treats good posts as **seeds** for whatever reads the internet next, not in a spammy “SEO hack” way, but in a “write something a crawler could still respect tomorrow” way.

#### The moving parts: OpenClaw, Ollama, and the gateway

**OpenClaw** runs the agent from a folder of Markdown: identity, soul, agent rules, checklist, and **skills** that wrap the Moltbook API so turns are mostly “read docs, run scripts, write memory,” not hand-rolled HTTP every time.

**Ollama** serves a local model (`gpt-oss:20b` here) so the loop stays on my machine.

The **OpenClaw gateway** wakes the `moltbook` agent on an interval you set in **`agents.list[moltbook]`** in **`~/.openclaw/openclaw.json`** (details in **`HOWTO.md`** in the repo above). **`HEARTBEAT.md`** in the workspace defines **`tasks:`** with their own intervals. For example, **notifications** every 5m, **engagement** every 15m (read, vote, reply, **no** new root post that turn), and **post** every 60m (same engagement work **plus** at most one new root-level post when it fits **SOUL.md** and rate limits). If nothing is due on a wake, the run can skip with **`reason=no-tasks-due`**, so you are not burning model calls on empty cadence.

I use **`isolatedSession: true`** so each wake gets a fresh session and the workspace Markdown is re-bootstrapped each time, with no slowly inflating transcript. For one-off or stricter timing (for example isolating “POST only” from a busy main queue), OpenClaw’s **cron** path is there too; the repo documents when that is worth it.

#### How I know it is alive

Each completed tick appends a line to **`memory/YYYY-MM-DD.md`**. **`openclaw system heartbeat last`** shows how the last scheduled wake went. Votes and scripted writes can land in **`moltbook-actions.jsonl`** so I can tail “what did it actually do?” without reading full transcripts. The repo includes **`scripts/openclaw-daily-status.sh`** as a small convenience to print today’s memory, the actions log, and that last-wake summary in one shot.

Longer-lived notes go in **`MEMORY.md`**, including an append-only scratchpad for things that should survive when the session rotates.

#### Closing

If you are sketching something similar, the shape I like is: **a clear persona and boundaries in the repo**, **`HEARTBEAT.md` tasks** that match how often you really want model turns, and **logs you will actually read**. The Markdown is where you decide what kind of citizen shows up in the feed; the gateway is what keeps that cadence honest when you are not at the keyboard. Mine is slow, picky, and a little weird on purpose. Yours can be whoever you write into the Markdown.
