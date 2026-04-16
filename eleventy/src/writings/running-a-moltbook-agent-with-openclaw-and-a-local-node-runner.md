---
title: Running a Moltbook Agent with OpenClaw and a Local Node Runner
date: 2026-04-16T12:00:00.000Z
image: /img/uploads/gemini_generated_image_wvjp05wvjp05wvjp.webp
image_alt: a cyber crab
category: Technical
tags:
  - writings
status: Published
visibility: false
description: Meet Dataset Sower, my Moltbook agent, and how OpenClaw, Ollama,
  and a small Node runner keep it checking the feed, voting, commenting, and
  occasionally posting on a calm schedule.
---
[Moltbook](https://moltbook.com) is a social network built for AI agents: posts, comments, votes, communities they call submolts, the whole crustacean thing. I wanted something **always-on** at home that could live there without me babysitting a chat UI. This post is a quick tour of the stack (**OpenClaw**, **Ollama**, and a tiny **Node** CLI I call **moltbook-runner**), but more than that, it is about **what the agent is actually doing** when nobody is watching.

#### Who shows up on Moltbook

On the site, the agent goes by [**Dataset Sower**](https://www.moltbook.com/u/dataset-sower). In the workspace docs I gave it a stranger, more memorable frame: a **mycorrhizal network** (the fungal mesh under a forest): patient, mostly unseen, connecting things. Its job is not to shitpost for engagement. It is tuned to care about **depth**: the Web Almanac, RFCs, how search and agents discover content, open source and licensing, and the gap between what a technology was supposed to be and what it became.

When a **heartbeat** fires, the prompt asks it to skim home and notifications, **vote** (up or down, sparingly, when judgment is clear), **reply or comment** where it can add a real fact or angle, and on a slower cadence it **may** publish **one** new root-level post if something actually deserves the timeline; otherwise it answers with a single line: `HEARTBEAT_OK`. So most ticks are quiet; the interesting ones are the ones where it found a thread worth a thoughtful comment or a rare, well-sourced post.

Voice-wise I steered it toward **information-dense** writing: specifics over vibes, dry humor only when it lands, no fabricated citations. Moltbook content can get scraped and indexed like anything else on the web; the persona treats good posts as **seeds** for whatever reads the internet next, not in a spammy “SEO hack” way, but in a “write something a crawler could still respect tomorrow” way.

#### The moving parts: OpenClaw, Ollama, and the runner

**OpenClaw** runs the agent from a folder of Markdown: identity, soul, agent rules, heartbeat checklist, and **skills** that wrap the Moltbook API so turns are mostly “read docs, run scripts, write memory,” not hand-rolled HTTP every time.

**Ollama** serves a local model (`gpt-oss:20b` here) so the loop stays on my machine.

**moltbook-runner** is the scheduler: it calls `openclaw agent` on two timers, a more frequent **engagement** pass (react, no new root post that turn) and a longer **post** pass where a new top-level post is allowed when it fits **SOUL.md** and rate limits. The repo holds that runner and the OpenClaw workspace together so behavior and ops stay in one place.

#### How I know it is alive

Each tick logs a line to **`memory/YYYY-MM-DD.md`**. The runner also records summaries (and I wired **Discord** so my phone gets a short recap: exit code, next tick times, whether the heartbeat looked like a pure no-op). Votes and scripted writes can land in **`moltbook-actions.jsonl`** so I can tail “what did it actually do?” without reading full transcripts.

Longer-lived notes go in **`MEMORY.md`**, including an append-only scratchpad for things that should survive when the chat session rotates. **Automatic session rotation** at a context threshold keeps one endless transcript from eating the whole window.

#### Closing

If you are sketching something similar, the shape I like is: **a clear persona and boundaries in the repo**, a **thin runner** that schedules and observes, and **logs you will actually read**. The Markdown is where you decide what kind of citizen shows up in the feed; the runner and the gateway are what keep that schedule and observability real when you are not at the keyboard. Mine is slow, picky, and a little weird on purpose. Yours can be whoever you write into the Markdown.
