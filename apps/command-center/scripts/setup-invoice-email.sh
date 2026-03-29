#!/bin/bash
# Setup invoice email ingestion for Wavult Group companies
source /home/erikwsl/.openclaw/secrets/credentials.env

# 1. Add MX record to quixzoom.com
echo "Adding MX record to quixzoom.com..."
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/e9a9520b64cd67eca1d8d926ca9daa79/dns_records" \
  -H "X-Auth-Email: wolfoftyreso@gmail.com" \
  -H "X-Auth-Key: $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MX",
    "name": "quixzoom.com",
    "content": "inbound-smtp.eu-west-1.amazonaws.com",
    "priority": 10,
    "ttl": 300
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('MX quixzoom.com:', d.get('success'))"

# 2. Create SES receipt rules for quixzoom.com
echo "Setting up SES receipt rules..."
aws ses create-receipt-rule \
  --rule-set-name wavult-whistleblower \
  --rule '{
    "Name": "quixzoom-billing",
    "Enabled": true,
    "Recipients": ["billing@quixzoom.com", "faktura@quixzoom.com"],
    "Actions": [{
      "S3Action": {
        "BucketName": "wavult-receipts",
        "ObjectKeyPrefix": "quixzoom/"
      }
    }],
    "ScanEnabled": false
  }' \
  --region eu-west-1 2>&1

# 3. Add wavult.com invoice rule (for when NS is switched)
aws ses create-receipt-rule \
  --rule-set-name wavult-whistleblower \
  --rule '{
    "Name": "wavult-billing",
    "Enabled": true,
    "Recipients": ["faktura@wavult.com", "billing@wavult.com"],
    "Actions": [{
      "S3Action": {
        "BucketName": "wavult-receipts",
        "ObjectKeyPrefix": "wavult/"
      }
    }],
    "ScanEnabled": false
  }' \
  --region eu-west-1 2>&1

echo "Done. Run: aws s3 mb s3://wavult-receipts --region eu-west-1"
