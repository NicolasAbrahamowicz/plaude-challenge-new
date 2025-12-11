# Plaude Engineering Challenge – Ops Agent

This repo contains my solution for the **Plaude Engineering Challenge**.

It implements an **Operations Agent** with a human-in-the-loop approval step using **Slack**.

## What it does

- **Next.js 16 (App Router)** UI (`frontend/`) with a simple chat panel to talk to the agent.
- **DurableAgent** workflow (`frontend/workflows/ops-agent/workflow.ts`) that:
  - Handles refunds and other operations via plain-text instructions.
  - Treats refunds as high-risk and sends them to Slack for human approval.
  - Supports both English and Spanish replies (based on the user’s latest message).
- **Tools** (`frontend/workflows/ops-agent/tools.ts`):
  - `requestSlackApproval`: posts a message to Slack with operation details + original user message and Approve/Reject links.
  - `checkLatestApprovalStatus`: reads the latest human decision from an in-memory store.
- **Slack → app loop**:
  - `/api/slack-decision` saves the human decision (approve/reject) in memory.
  - The frontend polls `/api/approval-status` and automatically posts an assistant message when the decision is available (no extra user input required).

# A VERY COMMON ERROR:
## "Sorry, something went wrong while processing your request. The team has been notified."
**If this happens, is 99% because of GROQ API limits (you can check in your IDE console), wait 1 minute and send a message again, with a paid API this should never happen**

# PLEASE TAKE INTO CONSIDERATION, SETUP BELOW MUST BE DONE IN ORDER FOR IT TO WORK LOCALLY, I SENT A YOUTUBE VIDEO WITH A BIT OF EXPLANATION ON THE SLACK STEPS, IT CAN BE DONE IN 5 MINUTES

## Slack webhook setup

- **To get SLACK_APPROVAL_WEBHOOK_URL**:

 **Go to https://api.slack.com/apps
 and Create New App → From scratch.**

- **In the left sidebar, go to Incoming Webhooks and enable them.**

- **Click Add New Webhook to Workspace, choose a channel, and allow.**

- **Copy the generated Webhook URL and paste it into:**

- **SLACK_APPROVAL_WEBHOOK_URL=https://hooks.slack.com/services/...**


- **The webhook URL should only live in your .env.local, never in the code.**

## Running locally

Inside `frontend/`:

```bash
npm install
npm run dev
```
## Using ngrok (for Slack callbacks)

If you want Slack (or any external client) to reach your local Next.js server:

- **Start dev server on port 3000**:

```npm run dev```


-  **In another terminal, start ngrok**:

```ngrok http 3000```


- **Copy the HTTPS URL shown by ngrok (e.g. https://abcd-1234.ngrok.io) and go to api.slack.com/app**:
- **Go to Interactivity and shortcuts, turn it on and:**
- **Request URL=https://abcd-1234.ngrok.io**


Restart npm run dev.

## Now the Approve/Reject links in Slack will point to the ngrok URL (e.g. https://abcd-1234.ngrok.io/api/slack-decision?...), so the full human-in-the-loop flow works end-to-end.

## Required env variables (in frontend/.env.local):

- GROQ_API_KEY=...
- SLACK_APPROVAL_WEBHOOK_URL=...
- PUBLIC_BASE_URL=http://localhost:3000
- PLAUDE_APPROVAL_AMOUNT_THRESHOLD=0


Then open http://localhost:3000 and talk to the agent:

Ask for a refund → it will request approval in Slack.

Approve or reject in Slack → the chat updates automatically once the decision is recorded.
