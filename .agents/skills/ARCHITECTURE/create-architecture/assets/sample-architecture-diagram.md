# Sample Architecture Diagrams

Architecture diagram examples in Mermaid format for different system types.

---

## Diagram 1: Full Stack SaaS Application (C4 Context Level)

### System Context Diagram

```mermaid
C4Context
    title System Context Diagram - Task Management SaaS

    Person(user, "User", "Task management user")
    Person(admin, "Admin", "System administrator")

    System(taskApp, "Task Management System", "Allows users to create, manage, and collaborate on tasks")

    System_Ext(stripe, "Stripe", "Payment processing")
    System_Ext(sendgrid, "SendGrid", "Email notifications")
    System_Ext(s3, "AWS S3", "File storage")
    System_Ext(auth0, "Auth0", "Authentication service")

    Rel(user, taskApp, "Uses", "HTTPS")
    Rel(admin, taskApp, "Administers", "HTTPS")

    Rel(taskApp, stripe, "Processes payments", "REST API")
    Rel(taskApp, sendgrid, "Sends emails", "REST API")
    Rel(taskApp, s3, "Stores files", "AWS SDK")
    Rel(taskApp, auth0, "Authenticates users", "OAuth 2.0")
```

---

## Diagram 2: Container Diagram (Next.js Fullstack App)

```mermaid
C4Container
    title Container Diagram - Task Management System

    Person(user, "User", "Application user")

    Container_Boundary(taskSystem, "Task Management System") {
        Container(webApp, "Web Application", "Next.js, React", "Provides UI and server-side rendering")
        Container(apiRoutes, "API Routes", "Next.js API", "Provides REST API for frontend and mobile")
        Container(database, "Database", "PostgreSQL", "Stores users, tasks, projects")
        Container(cache, "Cache", "Redis", "Caches sessions and frequent queries")
        Container(queue, "Background Jobs", "BullMQ", "Processes async tasks")
    }

    System_Ext(stripe, "Stripe", "Payments")
    System_Ext(email, "SendGrid", "Emails")
    System_Ext(storage, "AWS S3", "File storage")

    Rel(user, webApp, "Uses", "HTTPS")
    Rel(webApp, apiRoutes, "Makes API calls", "HTTPS")
    Rel(apiRoutes, database, "Reads/Writes", "SQL/TCP")
    Rel(apiRoutes, cache, "Caches", "Redis protocol")
    Rel(apiRoutes, queue, "Enqueues jobs", "Redis")
    Rel(apiRoutes, stripe, "Processes payments", "REST API")
    Rel(queue, email, "Sends emails", "REST API")
    Rel(apiRoutes, storage, "Stores files", "AWS SDK")
```

---

## Diagram 3: High-Level Architecture (3-Tier Web App)

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Browser]
        Mobile[Mobile App]
    end

    subgraph "CDN/Edge"
        CDN[CloudFront CDN<br/>Static Assets]
    end

    subgraph "Load Balancing"
        ALB[Application Load Balancer<br/>SSL Termination]
    end

    subgraph "Application Layer"
        App1[Next.js App<br/>Server 1]
        App2[Next.js App<br/>Server 2]
        App3[Next.js App<br/>Server 3]
    end

    subgraph "Caching Layer"
        Redis[Redis Cluster<br/>Sessions + Cache]
    end

    subgraph "Data Layer"
        Primary[(PostgreSQL<br/>Primary)]
        Replica1[(Read Replica 1)]
        Replica2[(Read Replica 2)]
    end

    subgraph "Storage Layer"
        S3[AWS S3<br/>File Storage]
    end

    Web --> CDN
    Mobile --> ALB
    CDN --> ALB
    ALB --> App1
    ALB --> App2
    ALB --> App3

    App1 --> Redis
    App2 --> Redis
    App3 --> Redis

    App1 --> Primary
    App2 --> Primary
    App3 --> Primary

    App1 --> Replica1
    App2 --> Replica1
    App3 --> Replica2

    Primary -.->|Replication| Replica1
    Primary -.->|Replication| Replica2

    App1 --> S3
    App2 --> S3
    App3 --> S3

    style Web fill:#e1f5ff
    style Mobile fill:#e1f5ff
    style CDN fill:#fff4e1
    style ALB fill:#ffe1e1
    style App1 fill:#e1ffe1
    style App2 fill:#e1ffe1
    style App3 fill:#e1ffe1
    style Redis fill:#ffe1f5
    style Primary fill:#f5e1ff
    style Replica1 fill:#f5e1ff
    style Replica2 fill:#f5e1ff
    style S3 fill:#fff4e1
```

---

## Diagram 4: Microservices Architecture

```mermaid
graph TB
    subgraph "Client Apps"
        WebApp[Web Application]
        MobileApp[Mobile App]
    end

    subgraph "API Gateway"
        Gateway[Kong API Gateway<br/>Rate Limiting, Auth]
    end

    subgraph "Services"
        UserSvc[User Service<br/>Node.js]
        TaskSvc[Task Service<br/>Node.js]
        NotifSvc[Notification Service<br/>Go]
        PaymentSvc[Payment Service<br/>Python]
    end

    subgraph "Message Bus"
        Kafka[Apache Kafka<br/>Event Streaming]
    end

    subgraph "Databases"
        UserDB[(User DB<br/>PostgreSQL)]
        TaskDB[(Task DB<br/>PostgreSQL)]
        NotifDB[(Notif DB<br/>MongoDB)]
    end

    subgraph "External Services"
        Stripe[Stripe API]
        SendGrid[SendGrid API]
    end

    WebApp --> Gateway
    MobileApp --> Gateway

    Gateway --> UserSvc
    Gateway --> TaskSvc
    Gateway --> NotifSvc
    Gateway --> PaymentSvc

    UserSvc --> UserDB
    TaskSvc --> TaskDB
    NotifSvc --> NotifDB

    UserSvc -.->|Publish Events| Kafka
    TaskSvc -.->|Publish Events| Kafka
    PaymentSvc -.->|Publish Events| Kafka

    Kafka -.->|Subscribe| NotifSvc

    PaymentSvc --> Stripe
    NotifSvc --> SendGrid

    style WebApp fill:#e1f5ff
    style MobileApp fill:#e1f5ff
    style Gateway fill:#ffe1e1
    style UserSvc fill:#e1ffe1
    style TaskSvc fill:#e1ffe1
    style NotifSvc fill:#e1ffe1
    style PaymentSvc fill:#e1ffe1
    style Kafka fill:#fff4e1
    style UserDB fill:#f5e1ff
    style TaskDB fill:#f5e1ff
    style NotifDB fill:#f5e1ff
```

---

## Diagram 5: Event-Driven Architecture

```mermaid
sequenceDiagram
    participant User
    participant WebApp
    participant API
    participant EventBus
    participant NotifWorker
    participant EmailSvc
    participant AuditWorker
    participant AuditDB

    User->>WebApp: Create Task
    WebApp->>API: POST /tasks
    API->>API: Validate & Create Task
    API->>EventBus: Publish TaskCreated Event
    API-->>WebApp: 201 Created
    WebApp-->>User: Task Created

    par Async Processing
        EventBus->>NotifWorker: TaskCreated Event
        NotifWorker->>EmailSvc: Send Notification Email
        EmailSvc-->>NotifWorker: Email Sent
    and
        EventBus->>AuditWorker: TaskCreated Event
        AuditWorker->>AuditDB: Log Event
        AuditDB-->>AuditWorker: Logged
    end
```

---

## Diagram 6: Deployment Architecture (AWS)

```mermaid
graph TB
    subgraph "Users"
        Users[Internet Users]
    end

    subgraph "AWS Cloud"
        subgraph "Edge"
            Route53[Route53<br/>DNS]
            CloudFront[CloudFront<br/>CDN]
        end

        subgraph "VPC - us-east-1"
            subgraph "Public Subnet"
                ALB[Application<br/>Load Balancer]
            end

            subgraph "Private Subnet - AZ1"
                App1[ECS Task<br/>Next.js App]
                RDS1[(RDS Primary<br/>PostgreSQL)]
            end

            subgraph "Private Subnet - AZ2"
                App2[ECS Task<br/>Next.js App]
                RDS2[(RDS Standby)]
            end

            subgraph "ElastiCache Subnet"
                Redis[ElastiCache<br/>Redis Cluster]
            end
        end

        subgraph "S3"
            S3Bucket[S3 Bucket<br/>File Storage]
        end
    end

    Users --> Route53
    Route53 --> CloudFront
    CloudFront --> ALB
    CloudFront --> S3Bucket

    ALB --> App1
    ALB --> App2

    App1 --> Redis
    App2 --> Redis

    App1 --> RDS1
    App2 --> RDS1

    RDS1 -.->|Replication| RDS2

    App1 --> S3Bucket
    App2 --> S3Bucket

    style Users fill:#e1f5ff
    style Route53 fill:#fff4e1
    style CloudFront fill:#fff4e1
    style ALB fill:#ffe1e1
    style App1 fill:#e1ffe1
    style App2 fill:#e1ffe1
    style Redis fill:#ffe1f5
    style RDS1 fill:#f5e1ff
    style RDS2 fill:#f5e1ff
    style S3Bucket fill:#fff4e1
```

---

## Diagram 7: Data Flow Diagram (Real-Time Collaboration)

```mermaid
graph LR
    subgraph "Client Side"
        Browser[Web Browser]
        Editor[Rich Text Editor]
    end

    subgraph "WebSocket Layer"
        WS[WebSocket Server<br/>Socket.IO]
        Redis[Redis Pub/Sub<br/>Cross-server Sync]
    end

    subgraph "Application Layer"
        CRDT[CRDT Engine<br/>Conflict Resolution]
        API[REST API<br/>Document Persistence]
    end

    subgraph "Storage"
        DB[(PostgreSQL<br/>Documents)]
        S3[S3<br/>Snapshots]
    end

    Browser <-->|WebSocket| WS
    Editor <-->|Local Edits| Browser

    WS <-->|Publish/Subscribe| Redis
    WS <-->|Document Operations| CRDT

    CRDT -->|Resolved Changes| API
    API -->|Store| DB
    API -->|Periodic Snapshots| S3

    style Browser fill:#e1f5ff
    style Editor fill:#e1f5ff
    style WS fill:#ffe1e1
    style Redis fill:#ffe1f5
    style CRDT fill:#e1ffe1
    style API fill:#e1ffe1
    style DB fill:#f5e1ff
    style S3 fill:#fff4e1
```

---

## How to Use These Diagrams

### In Architecture Documents

```markdown
# System Architecture

## High-Level Overview

[Insert Diagram 3: High-Level Architecture here]

Our system follows a standard 3-tier architecture with CDN edge caching...

## Container View

[Insert Diagram 2: Container Diagram here]

The application consists of several containers that work together...
```

### Rendering Diagrams

These Mermaid diagrams can be rendered in:
- **GitHub/GitLab:** Native Mermaid support in markdown
- **VS Code:** Mermaid preview extensions
- **Notion:** Embed as code blocks (limited support)
- **Mermaid Live Editor:** https://mermaid.live for testing
- **Documentation sites:** Docusaurus, MkDocs support Mermaid

### Diagram Types

**C4 Model (Recommended):**
- **Context:** System and external dependencies
- **Container:** High-level containers (apps, databases, services)
- **Component:** Internal components of containers
- **Code:** Class diagrams (rarely needed in architecture docs)

**Flowcharts:**
- **Graph TB/LR:** Top-to-bottom or left-to-right layouts
- Good for deployment, data flow, service interactions

**Sequence Diagrams:**
- Show interactions over time
- Good for API flows, event-driven processes

### Best Practices

1. **Keep it simple:** Don't overcrowd diagrams
2. **Use consistent colors:** Group related components
3. **Label clearly:** Every box should have a clear label
4. **Show data flow:** Use arrows to show direction
5. **Include legends:** Explain symbols and colors
6. **Version control:** Diagrams in markdown (not images)
7. **Update regularly:** Keep diagrams in sync with reality

---

*Reference test fixture for create-architecture skill - Use these as examples when generating architecture diagrams*
