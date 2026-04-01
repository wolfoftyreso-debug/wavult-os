#!/bin/bash
# Usage: ./infra/rollback.sh <service-name>
SERVICE=$1; REGION=eu-north-1; CLUSTER=hypbit
[ -z "$SERVICE" ] && echo "Usage: $0 <service>" && exit 1
CURRENT=$(aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query "services[0].taskDefinition" --output text)
FAMILY=$(echo $CURRENT | cut -d/ -f2 | cut -d: -f1)
PREV_REV=$(( $(echo $CURRENT | cut -d: -f2) - 1 ))
echo "🔄 Rolling back $SERVICE → $FAMILY:$PREV_REV"
aws ecs update-service --cluster $CLUSTER --service $SERVICE --task-definition "$FAMILY:$PREV_REV" --region $REGION --force-new-deployment
echo "✅ Rollback initiated"
