# Production Readiness Checklist

Checklist item yang perlu dilakukan sebelum deploy ke production.

---

## 🔴 Security (Wajib)

### File Storage
- [ ] Migrate uploads dari local filesystem ke R2/S3 object storage
- [ ] Implement signed URLs untuk download (mengganti direct file serving)
- [ ] Set lifecycle policy untuk temp files (auto-delete setelah 24 jam)

### Infrastructure
- [ ] PostgreSQL: Enable PITR + automated backups
- [ ] Redis: Setup Sentinel/Cluster untuk HA
- [ ] Define rate limiter failure mode (fail-closed)

### Webhook Security
- [ ] Tambahkan timestamp tolerance + replay protection
- [ ] IP allowlist untuk Xendit webhook (jika stabil)

---

## 🟡 Observability (Recommended)

- [ ] Setup Prometheus metrics (RPS, latency, error rate)
- [ ] Setup distributed tracing (propagate requestId)
- [ ] Configure alerts: error budget, auth anomaly, queue depth

---

## 🟢 Enhancement (Nice to Have)

- [ ] Admin audit logging (log semua privileged actions)
- [ ] CDN untuk static assets
- [ ] Read replicas untuk heavy read queries

---

## Verification Commands

```bash
# Before deploy, pastikan semua pass:
cd apps/server
npm run lint      # 0 errors
npm run typecheck # pass
npm run test      # all pass
npm run build     # success
```
