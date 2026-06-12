#!/bin/sh
apk add --no-cache redis > /dev/null

while ! redis-cli -h redis ping > /dev/null 2>&1; do
  sleep 2
done

while true; do
  CMD=$(redis-cli -h redis BLPOP suricata:commands 0 | sed -n 2p)

  if [ "$CMD" = "reload" ]; then     
     redis-cli -h redis GET suricata:rules:payload > /var/lib/suricata/rules/custom.rules
     
     docker exec suricata suricatasc -c ruleset-reload
  fi
done