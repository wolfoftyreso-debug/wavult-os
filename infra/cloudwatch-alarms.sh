#!/bin/bash
# CloudWatch Alarms setup for Wavult OS
# Account: 155407238699 | Cluster: hypbit | Region: eu-north-1

set -e

REGION="eu-north-1"
ACCOUNT="155407238699"
CLUSTER="hypbit"
SNS_TOPIC="arn:aws:sns:${REGION}:${ACCOUNT}:wavult-ops-alerts"

echo "📡 Setting up CloudWatch Alarms..."

# --- SNS Topic + Subscription ---
echo "Creating SNS topic..."
aws sns create-topic \
  --name wavult-ops-alerts \
  --region $REGION \
  --output text --query TopicArn

aws sns subscribe \
  --topic-arn "$SNS_TOPIC" \
  --protocol email \
  --notification-endpoint erik@hypbit.com \
  --region $REGION

echo "✅ SNS topic + subscription created (confirm the email!)"

# --- ECS Task Restart Alarms ---
SERVICES=(hypbit-api wavult-core identity-core quixzoom-api landvex-api)

for SERVICE in "${SERVICES[@]}"; do
  echo "Creating ECS alarm for: $SERVICE"

  aws cloudwatch put-metric-alarm \
    --alarm-name "ecs-${SERVICE}-tasks-low" \
    --alarm-description "ECS service ${SERVICE}: running tasks below desired for >5 min" \
    --namespace "ECS/ContainerInsights" \
    --metric-name "RunningTaskCount" \
    --dimensions Name=ClusterName,Value=$CLUSTER Name=ServiceName,Value=$SERVICE \
    --statistic Minimum \
    --period 60 \
    --evaluation-periods 5 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --treat-missing-data breaching \
    --alarm-actions "$SNS_TOPIC" \
    --ok-actions "$SNS_TOPIC" \
    --region $REGION

  echo "  ✅ $SERVICE alarm created"
done

# --- ALB 5xx Rate Alarm ---
echo "Creating ALB 5xx alarm..."

ALB_NAME="hypbit-api-alb"

# Get ALB suffix (needed for metric dimension)
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --region $REGION \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text 2>/dev/null || echo "MISSING")

if [ "$ALB_ARN" = "MISSING" ] || [ -z "$ALB_ARN" ]; then
  echo "  ⚠️  ALB '$ALB_NAME' not found — skipping ALB alarm"
else
  ALB_SUFFIX=$(echo "$ALB_ARN" | sed 's|.*loadbalancer/||')

  # 5xx error rate alarm using metric math
  aws cloudwatch put-metric-alarm \
    --alarm-name "alb-${ALB_NAME}-5xx-high" \
    --alarm-description "ALB ${ALB_NAME}: 5xx error rate >5%" \
    --metrics \
      '[
        {"Id":"e1","Expression":"m2/m1*100","Label":"5xx Rate (%)","ReturnData":true},
        {"Id":"m1","MetricStat":{"Metric":{"Namespace":"AWS/ApplicationELB","MetricName":"RequestCount","Dimensions":[{"Name":"LoadBalancer","Value":"'"$ALB_SUFFIX"'"}]},"Period":60,"Stat":"Sum"},"ReturnData":false},
        {"Id":"m2","MetricStat":{"Metric":{"Namespace":"AWS/ApplicationELB","MetricName":"HTTPCode_ELB_5XX_Count","Dimensions":[{"Name":"LoadBalancer","Value":"'"$ALB_SUFFIX"'"}]},"Period":60,"Stat":"Sum"},"ReturnData":false}
      ]' \
    --comparison-operator GreaterThanThreshold \
    --threshold 5 \
    --evaluation-periods 3 \
    --treat-missing-data notBreaching \
    --alarm-actions "$SNS_TOPIC" \
    --ok-actions "$SNS_TOPIC" \
    --region $REGION

  echo "  ✅ ALB 5xx alarm created"
fi

echo ""
echo "✅ All CloudWatch alarms configured!"
echo "⚠️  Check your inbox (erik@hypbit.com) to confirm the SNS subscription."
