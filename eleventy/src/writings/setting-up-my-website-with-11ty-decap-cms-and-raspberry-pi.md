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
This website is built with a stack centered around 11ty, Decap CMS, and a Raspberry Pi for hosting. Here’s an explanation of how the setup works.

#### 11ty for Static Site Generation

The site uses 11ty (Eleventy), a static site generator that transforms content written in Markdown and templates into static HTML files. The output is a lightweight, fast website that doesn’t rely on a traditional database or server-side processing for delivery.

#### Decap CMS for Content Management

To manage content, Decap CMS is integrated with the site. It provides a web-based interface for creating and editing content. Decap CMS works as a headless CMS and uses Git as the storage layer, committing changes directly to a GitHub repository. This allows for version-controlled content and avoids the need for a separate content database.

#### Hosting on Raspberry Pi

The website is hosted on a Raspberry Pi 5, a compact, low-power device suitable for serving static sites. The Pi runs the 11ty build process to generate the site and serves the resulting files. To expose the Pi to the internet securely, Cloudflare tunnel is used. This eliminates the need for direct port forwarding on the home network while providing a secure and reliable connection to the public web.

#### Git as a Version-Controlled Content Store

Instead of using a traditional database, Git is used as the storage solution for both content and configuration. Content changes made via Decap CMS are committed to a GitHub repository. The Raspberry Pi is set up to pull updates from this repository, ensuring that the site always reflects the latest changes. Each commit serves as a historical record of edits and updates.

#### Workflow Overview

1. **Content Updates**

   Decap CMS is accessed through a web interface to create or edit content. Changes are committed to the GitHub repository.
2. **Version Control**

   GitHub acts as the central repository for all content and site configuration files.
3. **Deployment**

   The Raspberry Pi pulls changes from the GitHub repository, triggers the 11ty build process, and deploys the updated static site.
4. **Public Access**

   Cloudflare tunnel routes external traffic to the Raspberry Pi securely, allowing the site to be accessed on the internet.

This configuration leverages modern static site generation tools, integrates content management directly with version control, and provides a cost-effective hosting solution using a Raspberry Pi. It is efficient, scalable for personal use, and straightforward to maintain.
