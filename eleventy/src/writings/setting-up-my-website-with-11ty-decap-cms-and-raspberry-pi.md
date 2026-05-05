---
title: Host Your Own Website on Raspberry Pi
date: 2025-01-05T18:35:00.000Z
image: /img/uploads/rasp-pi.webp
image_alt: A close view of a Raspberry Pi 4 computer, a small chip with various
  inputs and outputs.
category: Technical
tags:
  - writings
status: Published
visibility: true
description: Unlock self-hosting! Discover how to setup a personal website on
  Raspberry Pi. Gain full control and publish your ideas now.
---
# How to Setup a Personal Website on a Raspberry Pi (Complete Guide)

**My first post!! Welcome to my site.** I decided to prioritize a mix of tools that are lightweight, reliable, and easy to work with. I landed on using **11ty** for generating the site, **Decap CMS** for managing content, and a **Raspberry Pi** to host everything with style. Here is how it all fits together.

Want to host a personal web site from a tiny computer in your home? Running a small personal web server on a Raspberry Pi is inexpensive, educational, and surprisingly practical for blogs, portfolios, project pages, or internal dashboards. This tutorial walks you through the full setup: hardware, operating system, securing with a firewall, and the exact workflow I use to keep things running smoothly without needing a traditional web server like Nginx.

---

## Why host a personal web site on a Raspberry Pi?

* **Cost-effective:** A Pi + SD card + power supply is far cheaper than a recurring VPS subscription.
* **Learning:** You control every layer: OS, local services, DNS, and routing.
* **Privacy & ownership:** Your hosted website data stays in your home.
* **Performance:** For static sites, a Raspberry Pi (especially the **Pi 5**) is incredibly fast and energy-efficient.

> **Note:** A Raspberry Pi is best for low-to-medium traffic personal websites. For professional or high-traffic enterprise use, consider a VPS or managed host.

---

## My Tech Stack: The Core Components

Before we get into the step-by-step setup, here is the specific architecture I used to build this site. This approach ensures fast load times and excellent SEO.



### 11ty: Turning Content into a Website
At the core of the site is [11ty](https://www.11ty.dev/) (or Eleventy), a [static site generator](https://www.cloudflare.com/learning/performance/static-site-generator/). I write all my content in Markdown, and 11ty takes care of turning it into static HTML files. This keeps things simple: there is no database or [server-side processing](https://www.searchenginejournal.com/client-side-vs-server-side/482574/), just static files that load quickly and work everywhere. This also ensures fast load times, which is great for user experience and essential for ensuring your site indexes well.

### Decap CMS: Managing Content Through Git
To make it easier to manage content, I added a headless CMS called [Decap](https://decapcms.org/). I can login using my github account by navigating to `https://applehand.dev/admin`. Decap gives me a nice web interface for editing and adding new posts, which is handy because I do not want to deal with raw files. Decap CMS hooks into my GitHub repository, so every time I make a change, it commits the updates directly to the repo. Essentially, Git becomes the database for my content. 

### Hosting on a Raspberry Pi 5
The site runs on a **Raspberry Pi 5** in my office. It is a tiny, energy-efficient computer that is perfect for hosting my personal dev projects. The Pi handles everything: pulling updates from GitHub, running the 11ty build process, and serving the site. I use a **Cloudflare Tunnel** to make the site accessible on the web without opening up my home network. It is secure and saves me from dealing with port forwarding and complicated router configurations. In this setup, the Cloudflare Tunnel effectively acts as the reverse proxy, routing traffic directly to the local site directory or service.

### Git as the "Database"
Instead of using a traditional database, I rely on Git. All my content lives in [my github repository](https://github.com/Applehand/eleventy-site). When I update something in Decap CMS, it commits those changes to the repo, and the Pi pulls them down automatically using a [webhook server](https://github.com/Applehand/eleventy-site/blob/master/webhook-server/server.js). This server is always listening for a post request from Github that is sent whenever the repo is updated. This means the site is always up-to-date and version controlled for simple site restores.

---

## How It All Works Together: The Workflow

1.  **Content Updates**: I use Decap CMS to edit or add content, which commits changes to GitHub.
2.  **Version Control**: GitHub keeps track of all the changes and acts as the central hub for content and configuration.
3.  **Site Deployment**: The Raspberry Pi pulls updates from the Github repo, rebuilds the site with 11ty, and updates the local files.
4.  **Public Access**: A Cloudflare tunnel routes traffic securely from the internet to the Raspberry Pi, making the site live.

---

## Step-by-Step Setup Tutorial

### 1. Prepare the Operating System
Download and flash **Raspberry Pi OS** (64-bit) using Raspberry Pi Imager.
1.  Install Raspberry Pi Imager (Windows/macOS/Linux).
2.  Choose "Raspberry Pi OS (64-bit)" from the list.
3.  Select your SD card (or SSD) and click "Write."

**Initial Setup via SSH:**
Log in from your laptop:
```bash
ssh pi@raspberrypi.local
# Immediately change the default password:
passwd
# Set a friendly host name:
sudo hostnamectl set-hostname my-pi-web
# Update packages:
sudo apt update && sudo apt upgrade -y
```

### 2. Basic Security & Firewall
Enable UFW to protect your server:
```bash
sudo apt install ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw enable
```

### 3. Setup the Cloudflare Tunnel
Since I do not use Nginx, the Cloudflare Tunnel is the primary gateway for the site. It handles the connection between your local files and your domain.

1.  **Install cloudflared**: Follow the official Cloudflare guide to install the daemon on your Pi.
2.  **Authenticate**: Run `cloudflared tunnel login` to link your account.
3.  **Create the Tunnel**: Use the Cloudflare Zero Trust dashboard to create a new tunnel.
4.  **Configure Routing**: Point the tunnel to your local 11ty output directory. You can configure the tunnel to serve local files directly or point it to a simple local web service (like a lightweight Node.js server) running on a specific port.

### 4. Deployment Workflow
To automate your site updates like I do:
* Set up a **webhook server** on your Pi (Node.js is great for this).
* Configure a Webhook in your GitHub repository settings to ping your Pi's URL whenever a push occurs.
* The script should run `git pull` and `npx @11ty/eleventy` to rebuild the site. This ensures the static files are always fresh.

---

## Performance & Maintenance Tips

* **Boot from SSD**: A small SSD via USB 3.0 will vastly improve performance and longevity over an SD card.
* **Static is King**: Prefer static site generators (like 11ty) to reduce server load and security surface area.
* **Automate Updates**: Enable `unattended-upgrades` for security fixes: `sudo apt install unattended-upgrades`.
* **Version Control**: Because everything is in Git, if the Pi ever fails, you can be back up and running on a new device in minutes.

## Conclusion
Setting up a personal website on a Raspberry Pi is an excellent hands-on project that teaches networking, security, and server administration. By combining 11ty, Decap CMS, and a Pi 5, you get a professional-grade site that you own entirely. 

**Ready to try?** Flash your OS, set up your tunnel, and create your first index file today!
