# Axe-core Scanner Lambda Function

This AWS Lambda function provides accessibility scanning using axe-core and Puppeteer. It's designed to be called by the main Next.js application to offload the heavy scanning workload.

## Architecture

```
Next.js App → Lambda Function → Puppeteer + axe-core → Return Results
```

## Prerequisites

- AWS CLI configured (`aws configure`)
- Node.js 20.x
- IAM user with Lambda permissions

## Installation

```bash
cd lambda
npm install
```

## Deployment

### Automated Deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:

1. Install dependencies
2. Create deployment package
3. Create/update IAM role
4. Deploy Lambda function
5. Create Function URL
6. Output the Function URL

### Manual Deployment

If you prefer manual deployment:

1. **Install dependencies:**

   ```bash
   npm install --production
   ```

2. **Create deployment package:**

   ```bash
   zip -r function.zip src/ node_modules/ package.json
   ```

3. **Create Lambda function via AWS Console:**

   - Runtime: Node.js 20.x
   - Handler: src/index.handler
   - Memory: 2048 MB
   - Timeout: 60 seconds
   - Upload function.zip

4. **Enable Function URL:**
   - Auth type: NONE
   - Enable CORS

## Configuration

After deployment, add the Function URL to your `.env.local`:

```env
LAMBDA_SCANNER_URL=https://your-function-url.lambda-url.us-east-1.on.aws/
```

## Testing

### Test with curl:

```bash
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws/ \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

### Expected Response:

```json
{
  "success": true,
  "url": "https://example.com",
  "violations": [...],
  "passes": [...],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Cost Estimation

For 100 scans/month:

- Compute: ~$0.15/month (after free tier expires)
- Free tier: 1M requests + 400,000 GB-seconds/month
- **Effective cost: $0/month for first year**

## Updating

To update the Lambda function after code changes:

```bash
./deploy.sh
```

The script detects existing functions and updates them automatically.

## Monitoring

View logs in CloudWatch:

```bash
aws logs tail /aws/lambda/axe-scanner --follow
```

## Troubleshooting

### Function timeout

- Increase timeout in deploy.sh (currently 60s)
- Some websites may take longer to load

### Memory issues

- Increase memory in deploy.sh (currently 2048 MB)
- Chromium needs significant memory

### Permission errors

- Ensure IAM role has CloudWatch Logs permissions
- Check deploy.sh IAM role creation

## Development

### Local Testing

You can test the scanner locally:

```javascript
const { scanUrl } = require("./src/scanner");

scanUrl("https://example.com")
  .then((results) => console.log(results))
  .catch((err) => console.error(err));
```

Note: Local testing won't use @sparticuz/chromium, so install regular puppeteer:

```bash
npm install --save-dev puppeteer
```

## Files

- `src/index.js` - Lambda handler (API Gateway integration)
- `src/scanner.js` - Core scanning logic
- `package.json` - Dependencies
- `deploy.sh` - Automated deployment script
- `README.md` - This file

## Dependencies

- `@axe-core/puppeteer` - Simplified axe-core + Puppeteer integration
- `@sparticuz/chromium` - Lambda-optimized Chromium binary
- `puppeteer-core` - Headless browser automation

## Security Notes

- Function URL is public (NONE auth type)
- Consider adding API key authentication for production
- CORS is enabled for all origins (adjust as needed)
- Rate limiting should be handled by the Next.js app

## Next Steps

After deploying:

1. Copy Function URL to `.env.local`
2. Update Next.js to call Lambda instead of local Puppeteer
3. Test integration
4. Remove Puppeteer dependencies from main app
