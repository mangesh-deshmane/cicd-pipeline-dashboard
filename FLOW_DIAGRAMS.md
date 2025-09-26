# 🔄 CI/CD Pipeline Dashboard - Flow Diagrams

## 1. 📊 Overall System Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          End-to-End System Flow                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Developer Push          GitHub Actions          Webhook Handler         Dashboard
┌─────────────┐        ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
│             │  git   │             │  HTTP   │             │  SQL   │             │
│ Developer   │ push   │  Workflow   │ POST    │  FastAPI    │ INSERT │  Frontend   │
│ Commits     │───────►│  Execution  │────────►│  Backend    │───────►│  Dashboard  │
│             │        │             │         │             │        │             │
└─────────────┘        └─────────────┘         └─────────────┘        └─────────────┘
       │                       │                       │                       │
       │                       │                       │                       │
       ▼                       ▼                       ▼                       ▼
┌─────────────┐        ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
│   Code      │        │   Build     │         │  Database   │        │    User     │
│ Repository  │        │  Pipeline   │         │   Storage   │        │ Interface   │
└─────────────┘        └─────────────┘         └─────────────┘        └─────────────┘
                               │                       │
                               │ (if failed)           │
                               ▼                       ▼
                       ┌─────────────┐         ┌─────────────┐
                       │   Alert     │         │  Real-time  │
                       │  Service    │         │  Updates    │
                       └─────────────┘         └─────────────┘
                               │
                               ▼
                       ┌─────────────┐
                       │ Email/Slack │
                       │Notifications│
                       └─────────────┘
```

## 2. 🔗 Webhook Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Webhook Processing Flow                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

GitHub Actions                    FastAPI Backend                    Database
┌─────────────┐                  ┌─────────────┐                   ┌─────────────┐
│  Workflow   │                  │  Webhook    │                   │   Builds    │
│  Completes  │                  │  Endpoint   │                   │   Table     │
│             │                  │             │                   │             │
│ ┌─────────┐ │   HTTP POST      │ ┌─────────┐ │   SQL INSERT      │ ┌─────────┐ │
│ │Success/ │ │ ────────────────►│ │ Auth &  │ │ ─────────────────►│ │ Build   │ │
│ │Failure/ │ │   JSON Payload   │ │ Parse   │ │   Normalized Data │ │ Record  │ │
│ │Running  │ │                  │ │ Data    │ │                   │ │         │ │
│ └─────────┘ │                  │ └─────────┘ │                   │ └─────────┘ │
└─────────────┘                  └─────────────┘                   └─────────────┘
       │                                │                                 │
       │                                │                                 │
       ▼                                ▼                                 ▼
┌─────────────┐                  ┌─────────────┐                   ┌─────────────┐
│ Webhook     │                  │ Status      │                   │ Metrics     │
│ Payload:    │                  │ Check:      │                   │ Update:     │
│             │                  │             │                   │             │
│ • run_id    │                  │ if status   │                   │ • Success   │
│ • status    │                  │ == "failed" │                   │   Rate      │
│ • branch    │                  │     ↓       │                   │ • Avg Time  │
│ • commit    │                  │ Send Alert  │                   │ • Build     │
│ • duration  │                  │             │                   │   Count     │
│ • actor     │                  │             │                   │             │
└─────────────┘                  └─────────────┘                   └─────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Alert       │
                                 │ Service     │
                                 │             │
                                 │ • Email     │
                                 │ • Slack     │
                                 │ • Template  │
                                 └─────────────┘
```

## 3. 🎯 Detailed Webhook Processing Steps

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Step-by-Step Webhook Processing                              │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: Authentication
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HTTP Request                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ POST /api/webhook/github-actions                                            │ │
│ │ Headers:                                                                    │ │
│ │   Authorization: Bearer <WRITE_KEY>                                         │ │
│ │   Content-Type: application/json                                            │ │
│ │ Body: { workflow_run: {...}, repository: {...} }                           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
Step 2: Payload Parsing
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Extract Data from JSON                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ workflow_run.id           → external_id                                     │ │
│ │ workflow_run.conclusion   → status (success/failed/running)                 │ │
│ │ workflow_run.head_branch  → branch                                          │ │
│ │ workflow_run.head_commit  → commit_sha                                      │ │
│ │ sender.login              → triggered_by                                    │ │
│ │ workflow_run.html_url     → url                                             │ │
│ │ run_started_at            → started_at (parsed to datetime)                 │ │
│ │ updated_at                → finished_at (if completed)                      │ │
│ │ Calculate                 → duration_seconds                                │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
Step 3: Database Storage
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Create Build Record                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ build = Build(                                                              │ │
│ │     external_id=external_id,                                                │ │
│ │     status=status,                                                          │ │
│ │     branch=branch,                                                          │ │
│ │     commit_sha=commit_sha,                                                  │ │
│ │     triggered_by=triggered_by,                                              │ │
│ │     url=url,                                                                │ │
│ │     started_at=started_at,                                                  │ │
│ │     finished_at=finished_at,                                                │ │
│ │     duration_seconds=duration_seconds,                                      │ │
│ │     provider_id=1,  # GitHub Actions                                        │ │
│ │     raw_payload=payload                                                     │ │
│ │ )                                                                           │ │
│ │ session.add(build)                                                          │ │
│ │ await session.commit()                                                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
Step 4: Alert Processing
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Check Build Status                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ if status == "failed":                                                      │ │
│ │     alert_result = await alert_service.send_build_failure_alert(           │ │
│ │         build, "GitHub Actions"                                             │ │
│ │     )                                                                       │ │
│ │     # Send email with build details                                         │ │
│ │     # Log alert delivery status                                             │ │
│ │ else:                                                                       │ │
│ │     # No alert needed for success/running builds                            │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
Step 5: Response
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Return Success Response                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ HTTP 200 OK                                                                 │ │
│ │ {                                                                           │ │
│ │   "message": "Webhook processed successfully",                              │ │
│ │   "build_id": 123                                                           │ │
│ │ }                                                                           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4. 📱 Frontend Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Frontend Real-time Updates                              │
└─────────────────────────────────────────────────────────────────────────────────┘

Page Load                    Auto-refresh Timer              API Calls
┌─────────────┐             ┌─────────────┐                ┌─────────────┐
│   User      │             │   Every     │                │   Fetch     │
│  Opens      │             │ 30 Seconds  │                │   Data      │
│ Dashboard   │             │             │                │             │
└─────────────┘             └─────────────┘                └─────────────┘
       │                           │                               │
       ▼                           ▼                               ▼
┌─────────────┐             ┌─────────────┐                ┌─────────────┐
│ Initial     │             │ Trigger     │                │ GET /api/   │
│ Load Data   │◄────────────│ Refresh     │───────────────►│ metrics/    │
│             │             │ Function    │                │ summary     │
└─────────────┘             └─────────────┘                └─────────────┘
       │                                                           │
       ▼                                                           ▼
┌─────────────┐                                            ┌─────────────┐
│ Render      │                                            │ GET /api/   │
│ Dashboard   │◄───────────────────────────────────────────│ builds      │
│ Components  │                                            │             │
└─────────────┘                                            └─────────────┘
       │                                                           │
       ▼                                                           ▼
┌─────────────┐                                            ┌─────────────┐
│ • Metrics   │                                            │ JSON        │
│   Cards     │                                            │ Response    │
│ • Build     │◄───────────────────────────────────────────│ Processing  │
│   Table     │                                            │             │
│ • Status    │                                            └─────────────┘
│   Indicators│
└─────────────┘

JavaScript Functions:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ async function loadDashboardData() {                                            │
│     const metrics = await fetch('/api/metrics/summary');                        │
│     const builds = await fetch('/api/builds');                                  │
│     updateMetrics(metrics);                                                     │
│     updateBuildsTable(builds);                                                  │
│ }                                                                               │
│                                                                                 │
│ setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5. 🚨 Alert Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Alert Processing Flow                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Build Failure               Alert Service                Email/Slack
┌─────────────┐             ┌─────────────┐             ┌─────────────┐
│   Build     │             │   Check     │             │   Send      │
│  Status:    │             │ Duplicate   │             │ Notification│
│ "failed"    │             │   Alert     │             │             │
└─────────────┘             └─────────────┘             └─────────────┘
       │                           │                           │
       ▼                           ▼                           ▼
┌─────────────┐             ┌─────────────┐             ┌─────────────┐
│ Trigger     │             │ Generate    │             │ SMTP        │
│ Alert       │────────────►│ Email       │────────────►│ Delivery    │
│ Service     │             │ Template    │             │             │
└─────────────┘             └─────────────┘             └─────────────┘
                                   │                           │
                                   ▼                           ▼
                            ┌─────────────┐             ┌─────────────┐
                            │ Email       │             │ Slack       │
                            │ Content:    │             │ Webhook     │
                            │             │             │             │
                            │ • Build ID  │             │ • Channel   │
                            │ • Status    │             │ • Message   │
                            │ • Branch    │             │ • Format    │
                            │ • Commit    │             │             │
                            │ • Duration  │             │             │
                            │ • URL       │             │             │
                            └─────────────┘             └─────────────┘
                                   │                           │
                                   ▼                           ▼
                            ┌─────────────┐             ┌─────────────┐
                            │ Log Alert   │             │ Update      │
                            │ History     │             │ Alert       │
                            │             │             │ Status      │
                            └─────────────┘             └─────────────┘

Alert Deduplication Logic:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. Check if alert already sent for this build_id + channel                     │
│ 2. If duplicate found: Skip sending, log as duplicate                           │
│ 3. If new alert: Send notification, record in alert_history                     │
│ 4. Include build details, failure reason, and action items                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6. 🔄 Worker Polling Flow (Alternative to Webhooks)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Worker Polling Flow                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Scheduler                   Poller                      Provider APIs
┌─────────────┐            ┌─────────────┐             ┌─────────────┐
│   Cron      │            │   GitHub    │             │   GitHub    │
│  Timer      │            │  Actions    │             │  Actions    │
│ (60 sec)    │            │  Poller     │             │    API      │
└─────────────┘            └─────────────┘             └─────────────┘
       │                          │                           │
       ▼                          ▼                           ▼
┌─────────────┐            ┌─────────────┐             ┌─────────────┐
│ Trigger     │            │ Query       │             │ GET /repos/ │
│ Polling     │───────────►│ Recent      │────────────►│ {owner}/    │
│ Cycle       │            │ Builds      │             │ {repo}/     │
└─────────────┘            └─────────────┘             │ actions/runs│
                                  │                    └─────────────┘
                                  ▼                           │
                           ┌─────────────┐                   ▼
                           │ Process     │             ┌─────────────┐
                           │ Response    │◄────────────│ JSON        │
                           │ Data        │             │ Response    │
                           └─────────────┘             └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Convert to  │
                           │ Webhook     │
                           │ Format      │
                           └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Send to     │
                           │ Dashboard   │
                           │ API         │
                           └─────────────┘

Polling Configuration:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ • WORKER_POLL_INTERVAL: 60 seconds                                             │
│ • WORKER_JITTER_SECONDS: 10 seconds (prevent thundering herd)                  │
│ • GITHUB_REPOS: Comma-separated list of repositories to monitor                 │
│ • Rate Limiting: Respects GitHub API limits (5000 requests/hour)               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 7. 📊 Database Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Database Interaction Flow                                │
└─────────────────────────────────────────────────────────────────────────────────┘

API Request                 SQLAlchemy ORM              Database
┌─────────────┐            ┌─────────────┐             ┌─────────────┐
│ GET /api/   │            │   Query     │             │   SELECT    │
│ metrics/    │            │ Builder     │             │   FROM      │
│ summary     │            │             │             │   builds    │
└─────────────┘            └─────────────┘             └─────────────┘
       │                          │                           │
       ▼                          ▼                           ▼
┌─────────────┐            ┌─────────────┐             ┌─────────────┐
│ Calculate   │            │ Build SQL   │             │ Execute     │
│ Metrics:    │◄───────────│ Query with  │────────────►│ Query       │
│             │            │ Filters     │             │             │
│ • Success   │            │             │             │ WHERE       │
│   Rate      │            │ • Date      │             │ started_at  │
│ • Avg Time  │            │   Range     │             │ >= ?        │
│ • Build     │            │ • Status    │             │ AND status  │
│   Count     │            │   Filter    │             │ IN (...)    │
└─────────────┘            └─────────────┘             └─────────────┘
       │                                                       │
       ▼                                                       ▼
┌─────────────┐                                        ┌─────────────┐
│ JSON        │                                        │ Result Set  │
│ Response    │◄───────────────────────────────────────│ Processing  │
│             │                                        │             │
└─────────────┘                                        └─────────────┘

Key Queries:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. Metrics Summary:                                                             │
│    SELECT COUNT(*), AVG(duration_seconds), status                               │
│    FROM builds WHERE started_at >= (NOW() - INTERVAL '7 days')                 │
│    GROUP BY status                                                              │
│                                                                                 │
│ 2. Recent Builds:                                                               │
│    SELECT * FROM builds                                                         │
│    ORDER BY started_at DESC                                                     │
│    LIMIT 50 OFFSET 0                                                            │
│                                                                                 │
│ 3. Build Details:                                                               │
│    SELECT b.*, p.name as provider_name                                          │
│    FROM builds b JOIN providers p ON b.provider_id = p.id                      │
│    WHERE b.id = ?                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

These flow diagrams provide a comprehensive view of how data moves through your CI/CD Pipeline Dashboard system, from initial webhook reception to final user interface updates. You can use these in your demo to show the technical depth and thought that went into the system design!
