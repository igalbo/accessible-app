# Lambda Quick Start

## Deployment

1. **Add environment variables to Lambda:**

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

2. **Deploy:**

```bash
./deploy.sh
```

3. **Add Function URL to Next.js `.env.local`:**

```
LAMBDA_SCANNER_URL=https://your-lambda-url.lambda-url.region.on.aws/
```

## What Changed

- Lambda now writes directly to Supabase (no callback URL needed)
- Frontend uses Realtime subscriptions + polling fallback
- Works in local development (no localhost issues)
