# Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ UserSession : has
    User ||--o| Subscription : has
    User ||--o{ Project : owns
    User ||--o{ Prompt : creates
    User ||--o{ ExportHistory : exports
    User ||--o{ PaymentHistory : pays
    User ||--o{ StreamSession : streams
    User ||--o{ DirectorSession : directs

    Project ||--o{ ProjectAsset : contains
    Project ||--o| Timeline : has
    Project ||--o{ ProjectVersion : versions
    Project ||--o{ ExportHistory : exports
    Project ||--o{ Job : jobs

    Timeline ||--o{ TimelineTrack : has
    TimelineTrack ||--o{ TimelineClip : contains
    TimelineClip }o--|| ProjectAsset : uses

    Prompt ||--o{ PromptVersion : versions

    DirectorSession ||--o| DirectorAsset : has
    DirectorSession ||--o| DirectorAnalysisJob : analyzes
    DirectorSession ||--o{ DirectorSelectedClip : selects
    DirectorSession ||--o| DirectorTranscribeJob : transcribes
    DirectorSession ||--o| DirectorSubtitleStyle : styles
    DirectorSession ||--o| DirectorExportJob : exports

    DirectorAnalysisJob ||--o{ DirectorClipCandidate : produces
    DirectorClipCandidate ||--o{ DirectorSelectedClip : selected

    User {
        string id PK
        string email UK
        string password
        string name
        string avatarUrl
        enum role
    }

    Project {
        string id PK
        string userId FK
        string title
        enum status
        json settings
    }

    ExportHistory {
        string id PK
        string userId FK
        string projectId FK
        enum format
        enum resolution
        enum status
        int progress
    }
```

## Core Tables

### User & Auth

| Table             | Purpose                          |
| ----------------- | -------------------------------- |
| `users`           | User accounts                    |
| `user_sessions`   | JWT sessions with refresh tokens |
| `subscriptions`   | Subscription tiers               |
| `payment_history` | Payment records                  |

### Project & Timeline

| Table              | Purpose              |
| ------------------ | -------------------- |
| `projects`         | User projects        |
| `project_assets`   | Uploaded media files |
| `timelines`        | Timeline settings    |
| `timeline_tracks`  | Video/audio tracks   |
| `timeline_clips`   | Individual clips     |
| `project_versions` | Version snapshots    |

### Export & Processing

| Table            | Purpose            |
| ---------------- | ------------------ |
| `export_history` | Export job records |
| `download_jobs`  | URL download tasks |
| `jobs`           | Async job queue    |

### AI Director

| Table                      | Purpose         |
| -------------------------- | --------------- |
| `director_sessions`        | Wizard sessions |
| `director_assets`          | Source videos   |
| `director_analysis_jobs`   | Scene analysis  |
| `director_clip_candidates` | Detected clips  |
| `director_selected_clips`  | User selections |
| `director_transcribe_jobs` | Whisper jobs    |
| `director_export_jobs`     | Final exports   |

### Streaming

| Table                   | Purpose         |
| ----------------------- | --------------- |
| `stream_sessions`       | Live streams    |
| `stream_quota_cycles`   | Usage tracking  |
| `billing_subscriptions` | Billing records |

## Indexes

Critical indexes for performance:

- `users.email` - Login lookups
- `user_sessions.token` - Token validation
- `user_sessions.refreshToken` - Refresh flow
- `projects.userId` - User's projects
- `export_history.userId, status` - Job status
- `director_sessions.userId` - User sessions
