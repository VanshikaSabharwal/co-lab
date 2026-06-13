#!/usr/bin/env bash
# Docker Compose Smoke Test for LiveKit services
set -euo pipefail

echo "=== LiveKit Docker Compose Smoke Test ==="
echo ""

COMPOSE_FILE="docker-compose.livekit.yml"

# Check compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "FAIL: $COMPOSE_FILE not found. Run this from the project root."
  exit 1
fi

echo "✓ Docker Compose file found: $COMPOSE_FILE"

# Check docker is running
if ! docker info > /dev/null 2>&1; then
  echo "FAIL: Docker is not running. Start Docker and try again."
  exit 1
fi
echo "✓ Docker is running"

# Start services
echo ""
echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d --wait-timeout 60 2>&1

# Check each service
echo ""
echo "Checking service health..."

SERVICES=("livekit-server" "redis" "minio")
ALL_HEALTHY=true

for SERVICE in "${SERVICES[@]}"; do
  STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json "$SERVICE" 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "not found")
  if echo "$STATUS" | grep -qi "up"; then
    echo "✓ $SERVICE is healthy"
  else
    echo "FAIL: $SERVICE is not healthy (status: $STATUS)"
    ALL_HEALTHY=false
  fi
done

# Check LiveKit HTTP endpoint
echo ""
echo "Checking LiveKit HTTP endpoint..."
sleep 3
LIVEKIT_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7880 2>/dev/null || echo "000")
if [ "$LIVEKIT_HEALTH" = "200" ] || [ "$LIVEKIT_HEALTH" = "404" ]; then
  echo "✓ LiveKit HTTP endpoint reachable (HTTP $LIVEKIT_HEALTH)"
else
  echo "WARN: LiveKit HTTP endpoint returned HTTP $LIVEKIT_HEALTH (may need more time)"
fi

# Check MinIO console
echo ""
echo "Checking MinIO..."
MINIO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9001 2>/dev/null || echo "000")
if [ "$MINIO_STATUS" != "000" ]; then
  echo "✓ MinIO console reachable (HTTP $MINIO_STATUS)"
else
  echo "WARN: MinIO console not reachable"
fi

echo ""
if [ "$ALL_HEALTHY" = true ]; then
  echo "=== ALL SERVICES HEALTHY ==="
  echo ""
  echo "LiveKit:  http://localhost:7880"
  echo "Redis:    localhost:6379"
  echo "MinIO:    http://localhost:9001 (console) / http://localhost:9000 (API)"
  echo ""
  echo "To stop: docker compose -f $COMPOSE_FILE down"
  exit 0
else
  echo "=== SOME SERVICES FAILED ==="
  echo "Run 'docker compose -f $COMPOSE_FILE logs' for details."
  exit 1
fi
