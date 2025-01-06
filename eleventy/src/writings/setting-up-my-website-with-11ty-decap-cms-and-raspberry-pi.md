---
title: Setting Up My Website with 11ty, Decap CMS, and Raspberry Pi
date: 2025-01-05T18:35:00.000Z
image: /img/uploads/rasp-pi.webp
image_alt: A close view of a Raspberry Pi 4 computer, a small chip with various
  inputs and outputs.
category: Technical
tags:
  - writings
status: Draft
visibility: true
description: A technical breakdown of this website and the technologies I chose
  to build it with.
---
I built this site using a mix of tools that are lightweight, reliable, and easy to work with: 11ty for generating the site, Decap CMS for managing content, and a Raspberry Pi to host everything. Here’s how it all fits together.

#### 11ty: Turning Content into a Website

At the core of the site is 11ty (or Eleventy), a static site generator. I write all my content in Markdown, and 11ty takes care of turning it into static HTML files. This keeps things simple—there’s no database or server-side processing, just static files that load quickly and work everywhere.

#### Decap CMS: Managing Content Through Git

To make it easier to manage content, I added Decap CMS. It gives me a nice web interface for editing and adding new posts, which is handy when I don’t want to deal with raw files. Decap CMS hooks into my GitHub repository, so every time I make a change, it commits the updates directly to the repo. Essentially, Git becomes the database for my content.

#### Hosting on a Raspberry Pi

The site runs on a Raspberry Pi 5, which is small, energy-efficient, and perfect for hosting my personal dev projects. The Pi handles everything: pulling updates from GitHub, running the 11ty build process, and serving the site. I use a Cloudflare tunnel to make the site accessible on the web without opening up my home network. It’s secure and saves me from dealing with complicated router configurations.

#### Git as the "Database"

Instead of using a traditional database, I rely on Git. All my content and configuration live in a GitHub repository. When I update something in Decap CMS, it commits those changes, and the Pi pulls them down automatically. This means the site is always up-to-date, and I get version control for free. If I ever need to roll back a change, it’s just a Git command away.

#### How It All Works Together

Here’s a quick rundown of the workflow:

1. **Content Updates**

   : I use Decap CMS to edit or add content, which commits changes to GitHub.
2. **Version Control**

   : GitHub keeps track of all the changes and acts as the central hub for content and configuration.
3. **Site Deployment**

   : The Raspberry Pi pulls updates from the Github repo, rebuilds the site with 11ty, and serves the new version.
4. **Public Access**

   : A Cloudflare tunnel routes traffic securely from the internet to the Raspberry Pi, making the site live.

This setup is flexible, cost-effective, and gives me full control over how the site works. And self-hosting is just cool.
