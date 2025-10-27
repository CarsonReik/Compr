# Compr Automation Worker

Puppeteer-based automation service for crosslisting items to Poshmark, Mercari, and Depop.

## Architecture

- **BullMQ**: Job queue for managing crosslisting tasks
- **Redis**: Message broker for BullMQ
- **Puppeteer**: Headless Chrome automation
- **Supabase**: Database for job status and results
- **Docker**: Containerization for easy deployment

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Required environment variables:**
- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis authentication password
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `ENCRYPTION_KEY`: 32-byte hex key (generate with `openssl rand -hex 16`)

### 3. Build TypeScript

```bash
npm run build
```

### 4. Run Worker

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will start:
- Redis server on port 6379
- Worker service that processes crosslisting jobs

### View Logs

```bash
docker-compose logs -f worker
```

### Stop Services

```bash
docker-compose down
```

## Job Flow

1. User clicks "Crosslist to Poshmark" in Next.js app
2. API route creates job in Redis queue
3. Worker picks up job from queue
4. Worker logs into platform with encrypted credentials
5. Worker creates listing using Puppeteer
6. Worker updates database with results
7. User sees success message with listing URL

## Monitoring

- **Logs**: Check `/var/log/crosslisting/worker.log` or Docker logs
- **Redis**: Use Redis CLI to inspect queue: `redis-cli -a $REDIS_PASSWORD`
- **Job Status**: Check `crosslisting_jobs` table in Supabase

## Troubleshooting

### Worker not processing jobs
- Check Redis connection: `docker-compose logs redis`
- Check worker logs: `docker-compose logs worker`
- Verify environment variables are set correctly

### Puppeteer errors
- Ensure Chromium is installed in Docker container
- Check screenshot in `screenshots/` directory for visual debugging
- Verify platform selectors haven't changed

### Login failures
- Verify encrypted credentials are correct
- Check if platform requires 2FA (not currently supported)
- Platform may be blocking automated logins (try adding delays)

## Development

### Project Structure

```
automation-worker/
├── src/
│   ├── workers/
│   │   └── poshmark-worker.ts    # Poshmark automation logic
│   ├── queue/
│   │   ├── queue.ts               # Queue setup
│   │   └── processor.ts           # Job processor
│   ├── utils/
│   │   ├── encryption.ts          # Decrypt credentials
│   │   └── logger.ts              # Logging utilities
│   └── index.ts                   # Main entry point
├── Dockerfile                      # Docker image definition
├── docker-compose.yml              # Docker services
└── package.json                    # Dependencies
```

### Adding New Platforms

To add support for a new platform (e.g., Mercari):

1. Create `src/workers/mercari-worker.ts`
2. Implement login and listing creation logic
3. Add case in `processor.ts` to route to new worker
4. Test thoroughly before deploying

## Security

- **Credentials**: All platform credentials are encrypted using AES-256-GCM
- **Redis**: Password-protected Redis connection
- **RLS**: Row Level Security on Supabase tables
- **Non-root user**: Docker container runs as non-root user
- **Secrets**: Never log decrypted credentials

## Performance

- **Concurrency**: 2 jobs processed simultaneously
- **Rate Limiting**: 10 jobs per minute
- **Retries**: Up to 3 attempts with exponential backoff
- **Memory**: ~500MB RAM per worker instance

## License

MIT
