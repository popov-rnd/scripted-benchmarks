#!/usr/bin/env bash

SPRING_JIT="java -jar spring/jit/spring-aot-benchmark-0.0.1-SNAPSHOT.jar"
SPRING_AOT="./spring/aot/spring-aot-benchmark"

MICRONAUT_JIT="java -jar micronaut/jit/micronaut-aot-benchmark-0.1-all.jar"
MICRONAUT_AOT="./micronaut/aot/micronaut-aot-benchmark"

QUARKUS_JIT="java -jar quarkus/jit/quarkus-app/quarkus-run.jar"
QUARKUS_AOT="./quarkus/aot/quarkus-aot-benchmark-1.0-SNAPSHOT-runner-mandrel"


# Switch here for different frameworks
DEMO_COMMAND="$SPRING_AOT"


START=$(date +%s%3N)

$DEMO_COMMAND &
MY_PID=$!

# Wait for readiness
while [ "$(curl -s -o /dev/null -L -w '%{http_code}' http://localhost:8080/)" != "200" ]; do
  sleep 0.001
done

READY=$(date +%s%3N)

echo "=== After startup ==="
echo "Startup ms: $((READY - START))"
ps -p $MY_PID -o rss,cputime

kill -9 $MY_PID
