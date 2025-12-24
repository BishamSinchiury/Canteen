#!/usr/bin/env bash
# Connect to postgres running in docker-compose (db service)
# Usage: ./scripts/connect_db.sh
set -euo pipefail
exec docker-compose exec db psql -U canteenuser -d db
