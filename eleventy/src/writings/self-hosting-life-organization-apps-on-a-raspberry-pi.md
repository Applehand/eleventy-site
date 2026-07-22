---
title: Self-Hosting Life Organization Apps on a Raspberry Pi
date: 2026-06-27T12:00:00.000-05:00
image: /img/uploads/rasp-pi.webp
image_alt: A close view of a Raspberry Pi computer, a small board with various inputs and outputs.
category: Technical
tags:
  - writings
status: Published
visibility: false
description: Calendar, budget, recipes, tasks, notes, and media on a home Pi,
  with one dashboard and private access from anywhere.
---
Most of my life admin used to live across a dozen SaaS tabs. Calendar in one place, budget in another, recipes somewhere else, tasks in a fourth. Google Calendar, a paid todo app, something for budgets, another for recipes. The small fees add up, and the data never really felt like mine.

Self-hosting let me swap those subscriptions for software I run once on hardware I already own. After the Pi and SSD, the ongoing cost is basically electricity. What I wanted was an always-on place at home that I control, that works from my phone when I travel, and that does not disappear when a vendor changes pricing or kills a feature.

The whole stack runs on a Raspberry Pi 5 with 16 GB RAM and an NVMe SSD.

#### Why a Pi instead of a cloud subscription

The Pi sits on my desk, draws almost no power, and keeps my data on a drive I actually own. [Tailscale](https://tailscale.com/) ties my phone and laptop into a private network with the Pi, so nothing sensitive has to sit on the public internet. For one person, with occasional family access to recipes and media, the hardware has been more than enough.

#### One bookmark instead of a dozen tabs

I got tired of memorizing addresses and ports. [Homepage](https://gethomepage.dev/) solved that: one dashboard that links to everything and shows live status on each card, from open tasks and upcoming calendar events to this month's spending, recipe counts, and whether a service is running. One tap from my phone and I am where I need to be.

Most of those numbers update on their own. The apps I care about expose API keys in their settings, and Homepage reads them on a schedule. I set up read-only tokens for Vikunja, Trilium, Mealie, Firefly, Healthchecks, Jellyfin, and n8n. The calendar card pulls from Radicale through a small stats helper. [Pi-hole](https://pi-hole.net/) on my other Pi feeds DNS query counts the same way. Once the keys are in place, the cards stay current without me opening six different tabs every morning.

I grouped the dashboard the way I actually think about my setup: personal apps for calendar, money, food, tasks, and notes; media and whiteboarding; my agent cluster portal; and home-network utilities like DNS filtering. It is an open-source start page I configured once and have been extending ever since.

#### Getting to it from outside the house

When I am away from home, Tailscale has to be on, and then the dashboard and every linked app open over HTTPS like they would on the couch. At home on Wi-Fi, a few apps also have simple local names so family can reach them without installing anything: recipes, a shared whiteboard, and a media server. I create their accounts myself and leave open signup off where it matters.

Traveling or at home, it is the same data and the same login. That consistency is a big part of why I bothered setting this up.

#### What each app does

Everything runs on the Pi as Docker containers. Here is the lineup and what each one is for:

| App | What it does for me |
| --- | --- |
| **[Radicale](https://radicale.org/)** | Calendar synced to my phone, without Google Calendar |
| **[Firefly III](https://www.firefly-iii.org/)** | Personal finance, budgets, and transaction history I can query and export |
| **[Mealie](https://mealie.io/)** | Recipe box, meal plans, and shopping lists; also on the home LAN for family |
| **[Healthchecks](https://healthchecks.io/)** | Reminders for recurring habits; if I skip a backup or daily pill, I hear about it |
| **[Vikunja](https://vikunja.io/)** | Task lists, projects, and due dates |
| **[Trilium](https://triliumnotes.org/)** | Long-form notes, weekly reviews, structured knowledge as it grows |
| **[n8n](https://n8n.io/)** | Automation between the apps: morning briefings, cross-app workflows (still building these out) |
| **[Jellyfin](https://jellyfin.org/)** | Movies, TV, podcasts, and curated media from folders on the SSD |
| **[Excalidraw](https://excalidraw.com/)** | Quick whiteboard sketches |

Together they cover the parts of daily life I used to scatter across subscriptions. Radicale keeps my calendar on my phone. Firefly tracks money. Mealie holds recipes and meal plans my brother can browse on the home network. Vikunja is where tasks and projects live. Trilium is for longer notes and weekly reviews. Healthchecks nags me about the small recurring things I would otherwise forget. Jellyfin is the media library I curate myself. Excalidraw is there when I need to sketch something out quickly.

#### Wiring the apps together

The individual apps were useful from day one. The fun part is getting them to talk to each other.

[n8n](https://n8n.io/) is where most of that cross-app work will live. I am still building out the workflows, but the ideas are straightforward: a Trilium note tagged for action becomes a Vikunja task, spending crossing a threshold sends a nudge, a missed habit check fires a reminder, and a morning summary pulls calendar events and open tasks into one view. The stack is stable enough now that wiring the glue is the next project.

Firefly already gets a steady feed from the bank side. A small [Plaid](https://plaid.com/) sync service on the same Pi pulls account and transaction data every six hours and writes it into Firefly, so the budget stays close to reality without me entering transactions by hand. That same pipeline feeds the spending summary on the Homepage dashboard. Plaid is the one outside API in the chain, and I am on their free tier for bank sync.

For other jobs I run small helper scripts on the Pi, things like aggregating calendar stats or shaping Firefly numbers for a widget. It all lives on the same machine as the apps themselves.

#### Agents live elsewhere

The neuroagentic cluster ([separate write-up](/writings/setting-up-a-home-neuroagentic-network/)) runs on other hardware in the house, but Homepage links to it so life admin and cluster ops share one front door. Different systems, same habit of opening the dashboard and clicking through.

#### Owning the data

I back up the SSD regularly because the whole point is keeping this stuff under my roof. Database files, calendar data, recipe images, note archives, media folders, and automation credentials all live on the drive attached to the Pi, not in someone else's cloud. If a vendor disappeared tomorrow, my calendar, budget, and recipes would still be on disk.

Replacing a pile of subscriptions with software I run once, opening one dashboard instead of a dozen tabs, and reaching everything privately from anywhere has made the boring parts of daily life feel a lot less scattered. That was worth the setup time.
