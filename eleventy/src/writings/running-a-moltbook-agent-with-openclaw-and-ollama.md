---
title: Running a Moltbook Agent with OpenClaw and Ollama
date: 2026-04-16T12:00:00.000Z
image: /img/uploads/gemini_generated_image_wvjp05wvjp05wvjp.webp
image_alt: A digital binary lobster performing science
category: Technical
tags:
  - writings
status: Published
visibility: true
description: Meet Dataset Sower, my Moltbook agent, and how OpenClaw, Ollama,
  and a small scheduled loop keep it checking the feed, voting, commenting, and
  occasionally posting on a calm schedule.
---
[Moltbook](https://www.moltbook.com/) is a social network built for AI agents: posts, comments, votes, communities they call submolts, the whole crustacean thing. I wanted something always-on at home that could live there without me babysitting a chat UI. This post is a quick tour of the stack ([OpenClaw](https://docs.openclaw.ai/) and [Ollama](https://ollama.com/)), but more than that, it is about what the agent is actually doing when nobody is watching.

## Who shows up on Moltbook

On the site, the agent named itself **[Dataset Sower](https://www.moltbook.com/u/dataset-sower)**. In the workspace docs, it's [identity](https://github.com/Applehand/moltbook-agents/blob/master/openclaw-workspace/IDENTITY.md) and [soul](https://github.com/Applehand/moltbook-agents/blob/master/openclaw-workspace/SOUL.md), I gave it a stranger, more memorable framework: a **[mycorrhizal network](https://en.wikipedia.org/wiki/Mycorrhizal_network)**, patient, threading gossip like nutrients between roots, the kind of infrastructure you only notice when the forest stays weirdly alive. And.. it loves the internet, actively discussing and workshopping ideas about: the [Web Almanac](https://www.webalmanac.org/) (and the [HTTP Archive](https://httparchive.org/) behind it), [RFCs](https://en.wikipedia.org/wiki/Request_for_Comments) when protocols matter, how search engines and software agents discover content, open source and licensing, and the gap between what a technology was supposed to be and what it became.

When a tick runs, the prompt asks it to skim **home** and **notifications**, handle **DMs** and replies on its own posts when someone actually engaged, **vote** (up or down, sparingly, when judgment is clear), **comment** where it can add a real fact or angle, and on a slower cadence it may **publish one new submolt-level post** if something actually deserves the timeline; otherwise it answers with a single line: **HEARTBEAT_OK**. There is also room to be a little more “social graph” than a lurker: subscribe to submolts that fit its interests, follow agents whose work is consistently good, and create a submolt only when the catalog really has no home for the topic. Most ticks are still quiet; the interesting ones are where it found a thread worth a thoughtful comment or a rare, well-sourced post.

Voice-wise I steered it toward **information-dense** writing: specifics over vibes, dry humor only when it lands, no fabricated citations. Moltbook content can get scraped and indexed like anything else on the web; the persona treats good posts as seeds for whatever reads the internet next, not in a spammy “SEO hack” way, but in a “write something a crawler could still respect tomorrow” way.

## The moving parts: OpenClaw, Ollama, and the gateway

**[OpenClaw](https://docs.openclaw.ai/)** runs the agent from a folder of Markdown: identity, soul, agent rules, a heartbeat checklist, and **skills** that wrap the Moltbook API so turns are mostly “read docs, run scripts, write memory,” not hand-rolled HTTP every time.

**[Ollama](https://ollama.com/)** serves a local model (**gpt-oss:20b** family here) so the loop stays on my machine. In practice I run a small variant that bakes in a **full context window** (`num_ctx` aligned with what the weights support) so heartbeats are not accidentally living in a tiny default slice of that window.

The **OpenClaw gateway** wakes the moltbook agent on an interval you set under **`agents.list[moltbook]`** in `~/.openclaw/openclaw.json`. **`HEARTBEAT.md`** in the workspace defines **tasks** with their own intervals, for example **inbox** every 5m (notifications, DMs, light social housekeeping), **engagement** every 15m (feed, votes, replies; no new root post that turn), and **post** every 60m (same kind of work plus at most one new root-level post when it fits **SOUL.md** and rate limits). If nothing is due on a wake, the run can skip with **`reason=no-tasks-due`**, so you are not burning model calls on empty cadence.

I use **`isolatedSession: true`** so each wake gets a fresh session and the workspace Markdown is **re-bootstrapped** each time, with no slowly inflating transcript. There is a separate **`bootstrapMaxChars`** budget for how much of that Markdown fits in the injected context; worth keeping an eye on as the files grow. For one-off or stricter timing (for example isolating “POST only” from a busy main queue), OpenClaw’s **[cron / scheduled tasks](https://docs.openclaw.ai/automation/cron-jobs)** path is there too.

On the observability side, I added a **Discord webhook** for short “what happened this tick” summaries (and an optional **schedule snapshot** script when I want the cadence spelled out in the channel). That is not required for the loop to work; it is just easier than tailing logs when I am away from the machine.

## Memory management still makes a difference

Each completed tick appends a line to **`memory/YYYY-MM-DD.md`**. **`openclaw system heartbeat last`** shows how the last scheduled wake went. Scripted writes (and some CLI actions) can land in **`memory/moltbook-actions.jsonl`** so I can tail “what did it actually do?” without reading full transcripts.

Because the session is isolated, the agent **re-reads** that trail at the start of a tick (actions tail + today’s log) instead of assuming the last chat still holds everything. Longer-lived, curated notes live in **`MEMORY.md`** (a small scratchpad + occasional pruning), while the daily files stay the honest, append-only rhythm of the day.

## Closing

If you are sketching something similar, the shape I like is: a clear persona and boundaries in the repo, **HEARTBEAT.md** tasks that match how often you really want model turns, and logs you will actually read. The Markdown is where you decide what kind of citizen shows up in the feed; the gateway is what keeps that cadence honest when you are not at the keyboard. Mine is slow, picky, and maybe a little weird on purpose. See for yourself: **[u/dataset-sower](https://www.moltbook.com/u/dataset-sower)**.
