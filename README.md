# 🏛️ CivicSense AI — Citizen Grievance Assistant

> **WeMakeDevs × AWS | First Commit Hackathon (Sept 17–20, 2026)**
> **Track:** Ship It | **Builder:** Naveen Singh (@codewithpiyus) | **Team:** 404 Not Founder

<!-- [![Live Demo](https://img.shields.io/badge/Live%20Demo-AWS%20Amplify-orange?style=flat-square&logo=amazonaws)](https://main.d86p74dnuf9m2.amplifyapp.com) -->
[![GitHub](https://img.shields.io/badge/GitHub-civicsense--ai-black?style=flat-square&logo=github)](https://github.com/piyusdev2006/civicsense-ai)

---

## 🎯 Problem

Municipal complaint portals across India suffer from **poor categorization, vague reports, and zero actionable routing**. Citizens report potholes, garbage, or broken streetlights — but reports disappear into a black hole with no AI triage, no urgency scoring, and no automated department routing.

## 💡 Solution

**CivicSense AI** lets a citizen upload a photo and describe the issue in **any local language** (Hindi, English, Hinglish). A 3-Layer AWS AI Pipeline instantly:

1. 🔍 **Detects** objects in the image (garbage, road damage, wires)
2. 📂 **Categorizes** the issue and scores urgency (High / Medium / Low)
3. 🏢 **Routes** a structured ticket to the correct municipal department
4. 📊 **Displays** all dispatched tickets on a live public dashboard

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    Citizen(["👤 Citizen\nPhoto + Text"])

    subgraph Amplify ["⚡ AWS Amplify — Next.js 16 App"]
        UI["🖥️ Frontend\nForm · Dashboard · UI"]
        API["🔌 API Routes\n/api/process-ticket\n/api/get-tickets"]
    end

    subgraph AIPipeline ["🤖 3-Layer AI Engine"]
        direction TB
        L1["🧠 Layer 1\nAmazon Bedrock\nNova Lite\nMultimodal AI"]
        L2["👁️ Layer 2\nAmazon Rekognition\nComputer Vision\nLabel Detection"]
        L3["💡 Layer 3\nSmart Fallback\nKeyword NLP\nHindi + English"]
        L1 -..->|"❌ Throttled /\nQuota Exceeded"| L2
        L2 -..->|"❌ Error /\nTimeout"| L3
    end

    S3[("📦 Amazon S3\nPhoto Storage")]
    DB[("🗃️ Amazon DynamoDB\nTicket Database")]
    CW["📊 Amazon CloudWatch\nPipeline Audit Logs"]
    Dashboard["📊 Live Dashboard\n🔴 HIGH · 🟡 MEDIUM · 🟢 LOW"]

    Citizen -->|"1️⃣ Submit"| UI
    UI -->|"Base64 + Text"| API
    API -->|"2️⃣ Upload Photo"| S3
    API -->|"3️⃣ Analyze"| AIPipeline
    AIPipeline -->|"4️⃣ Result"| API
    API -->|"5️⃣ Save Ticket"| DB
    API -->|"Log Events"| CW
    DB -->|"6️⃣ Fetch Tickets"| Dashboard
    Citizen -->|"View"| Dashboard

    style L1 fill:#FF9900,color:#000,stroke:#CC7A00
    style L2 fill:#FF9900,color:#000,stroke:#CC7A00
    style L3 fill:#1E8449,color:#fff,stroke:#145A32
    style S3 fill:#3F8624,color:#fff
    style DB fill:#3F8624,color:#fff
    style CW fill:#0070BA,color:#fff
    style Dashboard fill:#0070f3,color:#fff
```

---

## 🔄 End-to-End Pipeline Flow

```mermaid
flowchart TD
    A(["👤 Citizen\nOpens CivicSense AI"])
    B["📱 Web Form\nSelect photo + type description\nin Hindi / English / Hinglish"]
    C["⚡ Frontend\nConvert photo → Base64\nPOST /api/process-ticket"]

    subgraph Phase2 ["📦 Phase 2 — Store"]
        D["Generate UUID Ticket ID"]
        E["Upload photo to Amazon S3\nticketsticketId.jpg"]
        F["CloudWatch: S3_UPLOAD_SUCCESS ✅"]
    end

    subgraph Phase3 ["🤖 Phase 3 — Analyze"]
        G{"Try Bedrock\nNova Lite"}
        H["✅ Bedrock Success\ncategory + urgency + dept\nCloudWatch: AI_BEDROCK_SUCCESS"]
        I{"Try Rekognition\nDetectLabels"}
        J["✅ Rekognition Success\nGarbage 95% · Road 72%\nSmart category mapping\nCloudWatch: AI_REKOGNITION_SUCCESS"]
        K["✅ Keyword Fallback\nkachra → Garbage\ngaddha → Pothole\nbijli → Electricity\nCloudWatch: AI_FALLBACK_USED"]
    end

    subgraph Phase4 ["🗃️ Phase 4 — Save"]
        L["PutItem → DynamoDB CivicTickets\ntickerId · imageUrl · category\nurgency · dept · aiSource · status"]
        M["CloudWatch: TICKET_CREATED ✅"]
    end

    N["📊 Redirect → /dashboard\nFetch all tickets from DynamoDB"]
    O(["🔴 HIGH · 🟡 MEDIUM · 🟢 LOW\nColor-coded priority cards\nDispatched to departments"])

    A --> B --> C
    C --> Phase2
    D --> E --> F
    F --> Phase3
    G -->|"✅ Works"| H
    G -->|"❌ Throttled"| I
    I -->|"✅ Labels found"| J
    I -->|"❌ Error"| K
    H & J & K --> Phase4
    L --> M
    M --> N --> O

    style H fill:#1E8449,color:#fff
    style J fill:#FF9900,color:#000
    style K fill:#2E86C1,color:#fff
    style O fill:#0070f3,color:#fff
```

---

## 🧠 3-Layer AI Fallback Engine

```mermaid
flowchart TD
    IN(["📸 Photo + 📝 Text\nfrom Citizen"])

    subgraph L1Box ["Layer 1 — Primary AI"]
        L1["🧠 Amazon Bedrock\nNova Lite Model\nUnderstands image AND text together\nOutput: JSON with category + urgency"]
    end

    subgraph L2Box ["Layer 2 — Vision Fallback"]
        L2["👁️ Amazon Rekognition\nDetectLabels API\nGarbage 95% · Plastic 88% · Road 72%\nMaps labels → department + category"]
    end

    subgraph L3Box ["Layer 3 — Rule-Based Fallback"]
        L3["💡 Smart Keyword Engine\nHindi: kachra · gaddha · bijli · paani\nEnglish: garbage · pothole · wire · flood\nAlways works — cannot fail"]
    end

    OUT(["📋 Final Ticket Result\ncategory · urgency · department\naiSource: bedrock / rekognition / fallback"])

    IN --> L1
    L1 -->|"✅ Success"| OUT
    L1 -->|"❌ ThrottlingException\nFree tier quota hit"| L2
    L2 -->|"✅ Labels detected"| OUT
    L2 -->|"❌ Network error"| L3
    L3 -->|"✅ Always succeeds"| OUT

    style L1 fill:#FF9900,color:#000,stroke:#CC7A00,stroke-width:2px
    style L2 fill:#FF9900,color:#000,stroke:#CC7A00,stroke-width:2px
    style L3 fill:#1E8449,color:#fff,stroke:#145A32,stroke-width:2px
    style OUT fill:#0070f3,color:#fff,stroke:#0050b3,stroke-width:2px
```

---

## 🗃️ DynamoDB Data Model

```mermaid
erDiagram
    CivicTickets {
        string ticketId PK "UUID — Partition Key"
        string imageUrl    "S3 photo URL"
        string category    "Sanitation / Roads / Electricity / Water"
        string urgency     "High / Medium / Low"
        string department  "Waste Mgmt / Public Works / Electrical Div"
        string summary     "AI-generated description"
        string aiSource    "bedrock / rekognition / fallback"
        string status      "Open / Dispatched / Resolved"
        string createdAt   "ISO 8601 timestamp"
    }
```

---

## 📡 Complete Request Sequence

```mermaid
sequenceDiagram
    actor C as 👤 Citizen
    participant F as 📱 Frontend
    participant A as ⚡ API Route
    participant S3 as 📦 S3
    participant AI as 🤖 AI Pipeline
    participant DB as 🗃️ DynamoDB
    participant CW as 📊 CloudWatch

    Note over C,CW: ── PHASE 1: SUBMIT ──
    C->>F: Upload photo + description
    F->>F: Convert photo → Base64
    F->>A: POST { imageBase64, description }

    Note over A,S3: ── PHASE 2: STORE ──
    A->>S3: PutObject tickets/{uuid}.jpg
    S3-->>A: ✅ Permanent image URL
    A->>CW: S3_UPLOAD_SUCCESS

    Note over A,AI: ── PHASE 3: ANALYZE ──
    A->>AI: Try Bedrock (Nova Lite)
    alt ✅ Bedrock Works
        AI-->>A: { category, urgency, dept, summary }
        A->>CW: AI_BEDROCK_SUCCESS
    else ❌ Throttled → Rekognition
        A->>AI: DetectLabels (image bytes)
        AI-->>A: Labels → category mapping
        A->>CW: AI_REKOGNITION_SUCCESS
    else ❌ Both Failed → Fallback
        A->>AI: Keyword match (Hindi + English)
        AI-->>A: Rule-based category
        A->>CW: AI_FALLBACK_USED
    end

    Note over A,DB: ── PHASE 4: SAVE ──
    A->>DB: PutItem (full ticket document)
    A->>CW: TICKET_CREATED

    Note over A,C: ── PHASE 5: DISPLAY ──
    A-->>F: { success, ticketId, analysis }
    F->>C: Redirect → /dashboard
    C->>A: GET /api/get-tickets
    A->>DB: Scan CivicTickets
    DB-->>A: All tickets
    A-->>C: Color-coded priority cards
```


## ☁️ AWS Services Used (6 Total)

| # | Service | Role |
|---|---------|------|
| 1 | **AWS Amplify** | Full-stack Next.js hosting with CI/CD from GitHub |
| 2 | **Amazon Bedrock** (Nova Lite) | Multimodal AI — understands image + text together |
| 3 | **Amazon Rekognition** | Computer vision — detects objects in grievance photos |
| 4 | **Amazon S3** | Permanent, scalable storage for uploaded photos |
| 5 | **Amazon DynamoDB** | NoSQL ticket database with sub-millisecond reads |
| 6 | **Amazon CloudWatch** | End-to-end pipeline event logging & auditing |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- AWS Account with free tier access
- AWS IAM credentials with the following policies:
  `AmazonS3FullAccess` · `AmazonDynamoDBFullAccess` · `AmazonBedrockFullAccess` · `AmazonRekognitionFullAccess` · `CloudWatchLogsFullAccess`

### Local Setup

```bash
git clone https://github.com/piyusdev2006/civicsense-ai.git
cd civicsense-ai
npm install
```

Create `.env.local` in the project root:

```env
MOCK_MODE="false"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
S3_BUCKET_NAME="civicsense-uploads-1789895874138"
DYNAMODB_TABLE_NAME="CivicTickets"
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` → Upload a photo → Check the dashboard.

---

## ☁️ Deploying to AWS Amplify

### Step 1 — AWS Resources

The following resources must exist in your AWS account:

| Resource | Name |
|----------|------|
| S3 Bucket | `civicsense-uploads-1789895874138` |
| DynamoDB Table | `CivicTickets` (Partition Key: `ticketId`) |
| CloudWatch Log Group | `/civicsense-ai/tickets` (auto-created on first log) |

### Step 2 — Push to GitHub

```bash
git add -A
git commit -m "CivicSense AI - Final Submission"
git push -u origin main
```

### Step 3 — Connect to AWS Amplify

1. Open [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home)
2. Click **"Create new app"** → Select **GitHub**
3. Authorize and select the `civicsense-ai` repository
4. Under **Advanced settings**, add all 6 environment variables from `.env.local`
5. Click **"Save and deploy"** — live URL ready in ~5–10 minutes

### Cost Estimate

| Service | Free Tier | Est. Cost |
|---------|-----------|-----------|
| S3 | 5 GB + 20K requests | $0.00 |
| DynamoDB | 25 GB + 25 RCU/WCU | $0.00 |
| Rekognition | $1 / 1000 images | ~$0.05 |
| Bedrock | $0.06 / 1K tokens | ~$0.10 |
| Amplify | 1000 build mins | $0.00 |
| CloudWatch | 5 GB logs | $0.00 |
| **Total** | | **< $1** |

> 💡 Set up a [$10 AWS Budget Alert](https://us-east-1.console.aws.amazon.com/billing/home#/budgets/create?type=cost) to stay safe.

---

## 🧠 What I Learned

- Implementing **multimodal AI** with Amazon Bedrock's Converse API
- Building **graceful degradation** — 3-layer fallback ensuring 100% uptime
- Using **Amazon Rekognition** for real-time computer vision label detection
- Deploying full-stack serverless apps on **AWS Amplify**
- Designing **DynamoDB single-table schemas** for ticket management
- Monitoring production pipelines end-to-end with **Amazon CloudWatch**

---

## 📚 References

| # | Source | Used For |
|---|--------|---------|
| 1 | [affaan-m/ecc](https://github.com/affaan-m/ecc) | Backend separation of concerns across S3, Bedrock, Rekognition, DynamoDB helpers |
| 2 | [voltagent/awesome-design-md](https://github.com/voltagent/awesome-design-md) | UI color accessibility system (Red=High, Yellow=Medium, Green=Low) |
| 3 | [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) | Tailwind CSS minimal DOM depth and reusable class patterns |
| 4 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Accessible forms, buttons, and loading states |
| 5 | [vercel/next.js examples](https://github.com/vercel/next.js/tree/canary/examples) | App Router patterns and secure env variable handling |
| 6 | [aws-samples/serverless-workshops](https://github.com/aws-samples/aws-serverless-workshops) | DynamoDB single-table design, S3 patterns, CloudWatch best practices |
| 7 | [Bedrock Converse API Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html) | Multimodal AI inference with Nova Lite |
| 8 | [Rekognition DetectLabels Docs](https://docs.aws.amazon.com/rekognition/latest/dg/labels-detect-labels-image.html) | Computer vision label detection |
| 9 | [CloudWatch Logs Docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html) | Pipeline event logging |

---

*Built with ❤️ for India's cities | WeMakeDevs × AWS First Commit Hackathon 2026*
