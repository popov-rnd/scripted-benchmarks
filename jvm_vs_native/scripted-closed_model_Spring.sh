#!/bin/bash

START_TIME=$(date +%s)
RESULT_FILE="result_closed_model_Spring.txt"
CONCURRENCY_LEVELS=(1 2 4)
DURATION_PER_RUN="30s"
DURATION_PER_WARM_UP="60s"

echo "" > $RESULT_FILE

log() {
  echo "[$(date +'%H:%M:%S')] $1"
}

extract_metrics() {

  RPS=$(jq -r '.metrics.http_reqs.rate' summary.json)
  LAT_MS=$(jq -r '.metrics.http_req_duration.avg' summary.json)

  RPS_FMT=$(awk "BEGIN {printf \"%.0f\", $RPS}")
  LAT_FMT=$(awk "BEGIN {printf \"%.1f\", $LAT_MS}")

  echo "${RPS_FMT} req/sec, ${LAT_FMT}ms"
}

run_tests() {

  MODE=$1
  IMAGE=$2
  WARMUP=$3

  echo "// $MODE" >> $RESULT_FILE
  echo "" >> $RESULT_FILE

  log "======================================"
  log "Starting mode: $MODE"
  log "======================================"

  for C in "${CONCURRENCY_LEVELS[@]}"; do

    log "--------------------------------------"
    log "Mode: $MODE | Concurrency: $C"
    log "--------------------------------------"

    echo -n "Concurrency=$C: " >> $RESULT_FILE
    LINE=""

    for i in 1 2 3; do

      log "Run $i started..."

      # Defensive cleanup (optional but safe)
      docker rm -f spring-$MODE > /dev/null 2>&1 || true

      docker run -d \
        --name spring-$MODE \
        --cpuset-cpus="0,1" \
        --memory=1G \
        -p 8080:8080 \
        $IMAGE > /dev/null

      log "Container started. Waiting 10 seconds..."
      sleep 10

      if [ "$WARMUP" = "yes" ]; then
        log "Warmup JVM started..."
        k6 run \
        -e PRE_WARM_DURATION=$DURATION_PER_WARM_UP \
        run_k6_closed-loop_ingest_warm_up.js > /dev/null
        log "Warmup JVM completed."
      fi

      k6 run \
        -e VUS=$C \
        -e DURATION=$DURATION_PER_RUN \
        --summary-export=summary.json \
        run_k6_closed-loop_ingest.js > /dev/null

      METRICS=$(extract_metrics)

      log "Run $i result → $METRICS"

      if [ $i -eq 1 ]; then
        LINE="|$METRICS"
      else
        LINE="$LINE | $METRICS"
      fi

      docker stop spring-$MODE > /dev/null
      docker rm spring-$MODE > /dev/null

      log "Container stopped and removed."
      sleep 3
    done

    echo "$LINE" >> $RESULT_FILE
    log "Saved results for concurrency=$C"
    echo ""

  done

  echo "" >> $RESULT_FILE
}

echo "// Closed-loop" >> $RESULT_FILE
echo "" >> $RESULT_FILE

run_tests "Native" "spring-aot-benchmark:native" "no"
run_tests "JVM" "spring-aot-benchmark:jvm" "yes"

echo "// The end!" >> $RESULT_FILE

END_TIME=$(date +%s)
TOTAL_SEC=$((END_TIME - START_TIME))

HOURS=$((TOTAL_SEC / 3600))
MINS=$(((TOTAL_SEC % 3600) / 60))
SECS=$((TOTAL_SEC % 60))

DURATION_STR="Total test time: ${HOURS} hours, ${MINS} mins, ${SECS} secs"

# Write to result file
echo "// $DURATION_STR" >> $RESULT_FILE

log "======================================"
log "All tests finished."
log "$DURATION_STR"
log "Results saved to $RESULT_FILE"
log "======================================"
