# CloudSentinel: Simple Interview Prep Guide

Use this simple, plain-English guide to prepare for your interview. It uses easy analogies to explain how the system operates.

---

## 1. What is CloudSentinel?
Imagine you are building a secure house. Usually, security companies ask you to send them copies of all your door keys so they can monitor you from their central offices (this is how enterprise tools like Wiz or Datadog work). 

**CloudSentinel is different.** It is a **local-first** security dashboard. It builds a private security control room right inside your own basement. No passwords, cloud access keys, or blueprints ever leave your private network.

---

## 2. The Three Parts of the App
* **The Frontend (The TV Monitors)**: Written in standard HTML, CSS, and Javascript. It renders the charts (using Chart.js) and tables so developers can see the alerts.
* **The Backend (The Security Guard)**: Written in Python (Flask). It handles logins, talks to the database, runs the scanner engines, and computes security scores.
* **The Database (The Logbook)**: Written in PostgreSQL. It remembers the history of scans, who triggered them, and what vulnerabilities were found.

---

## 3. The Three Main Features

### A. Blueprint Scanning (Infrastructure as Code)
* **What it does**: Checks your cloud configurations *before* you build them in the real world.
* **Analogy**: Looking at a house blueprint and saying, *"Wait, the blueprint says the front door doesn't have a lock. Fix it before we build it."*
* **How it works**: It runs a tool called **Checkov** to inspect your Terraform templates.

### B. Cargo Inspection (Container Scanning)
* **What it does**: Scans container images (packaged software) for known code vulnerabilities (CVEs).
* **Analogy**: Like a port inspector checking shipping containers for cracks or hazards before they get loaded onto a ship.
* **How it works**: It runs a tool called **Trivy** to scan Docker images.

### C. Live Auditing & Drift Detection (Patrolling the Cloud)
* **What it does**: Audits your active AWS cloud or Kubernetes cluster and compares it with your code blueprints.
* **Analogy**: A developer gets a late-night call, logs into AWS, and manually opens a port to debug something, but forgets to close it. CloudSentinel patrols the live cloud, compares it against the code template, and highlights the difference (the "drift") in red/green, providing a quick fix.
* **How it works**: Uses the official AWS (Boto3) and Kubernetes SDKs to query live resources.

---

## 4. Two Simple Bugs We Resolved

### A. The Kubernetes "Invisible YAML" Bug
* **The Problem**: When we created a test pod configuration file (`test-pod.yaml`) in Windows PowerShell, Kubernetes kept complaining that the file was completely empty, even though we could see the text in our editor.
* **The Cause**: Windows PowerShell saves files using a character language called **UTF-16** by default. But Kubernetes only speaks **UTF-8**. It read the file as blank.
* **The Solution**: We ran a PowerShell script to convert the file's encoding to UTF-8, and it applied immediately.

### B. The Skipped Database ID Bug
* **The Problem**: Our scan report IDs skipped numbers (for example, Scan #1 was successful, but the next scan became Scan #3 instead of #2).
* **The Cause**: If a scan failed to write to the database midway, PostgreSQL rolled back the transaction. However, the database's auto-incrementing counter does not roll back (to prevent slowdowns). So, the ID number was permanently used up.
* **The Solution**: We updated the frontend to always read the exact ID returned in the server's response instead of guessing that the next number would follow sequentially.

---

## 5. How it Runs (DevOps)
Instead of having to install Python, PostgreSQL, and Nginx separately on a machine, we packaged the entire application inside three isolated containers using **Docker**. 
We use **Docker Compose** to start all three containers with one single command. We mapped the backend code directory as a shared folder so that when we edit Python code on Windows, the Docker container instantly hot-reloads the changes.

---

## 6. Architecture Critique: Local-First vs. Team Visibility

### The Trade-off
Running a scanner locally keeps credentials 100% secure and private, but it creates a **security blindspot**—the central security monitoring team (SOC) cannot see vulnerabilities isolated on a developer's local machine.

### How it is Solved in an Enterprise Setting
In a production team environment, CloudSentinel operates in a **Hybrid Flow**:
1. **Local "Shift-Left" Testing**: Developers use the local scan to fix issues instantly while writing code, preventing broken code from ever being committed.
2. **Automated CI/CD Gates**: The scanner runs automatically inside the shared CI/CD pipeline (like GitHub Actions). If a scan fails, the pipeline blocks the deploy.
3. **Central Private Deployment**: The Docker containers are hosted on a single central server inside the company's private network (VPC). The monitoring team logs into *this* central server to oversee all results.
4. **Integrations**: The backend is configured to forward findings to centralized logging tools (like Splunk or Datadog) and send webhook alerts to Slack when a critical issue is found.

---

## 7. Daily Workflow: Starting & Stopping Local Kubernetes

Whenever you close the application and want to boot it up again from scratch, follow these simple steps:

### 🚀 To Start:
1. Ensure **Docker Desktop** is open and running.
2. Start the Kind control-plane node:
   ```powershell
   docker start cloudsentinel-control-plane
   ```
3. Open a terminal tab and port-forward the **Frontend**:
   ```powershell
   kubectl port-forward svc/frontend 9000:80 --address 0.0.0.0
   ```
4. Open a second terminal tab and port-forward the **Backend**:
   ```powershell
   kubectl port-forward svc/backend 5000:5000
   ```
5. Open your web browser to: **`http://127.0.0.1:9000`**

### 🛑 To Stop:
1. Press **`Ctrl + C`** in both active port-forwarding terminals.
2. Stop the Kind cluster container to free up system memory:
   ```powershell
   docker stop cloudsentinel-control-plane
   ```
