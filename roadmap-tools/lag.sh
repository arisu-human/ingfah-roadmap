#!/bin/bash
# Does GraphQL immediately reflect a REST milestone write? (restores the value afterwards)
ORIG=$(gh api repos/100x-fi/zai-backend/milestones/50 --jq .due_on)
NEW="2026-08-24T00:00:00Z"
echo "original due_on: $ORIG   writing: $NEW"
gh api -X PATCH repos/100x-fi/zai-backend/milestones/50 -f due_on="$NEW" --jq '"REST reply: \(.due_on)"'
for d in 0 1 2 4 8; do
  [ "$d" != "0" ] && sleep $d
  G=$(gh api graphql -f query='{repository(owner:"100x-fi",name:"zai-backend"){milestone(number:50){dueOn}}}' --jq '.data.repository.milestone.dueOn')
  T=$(( $(date +%s) ))
  if [ "$G" = "$NEW" ]; then echo "  +${d}s GraphQL: $G   <- agrees"; else echo "  +${d}s GraphQL: $G   <- STALE"; fi
done
gh api -X PATCH repos/100x-fi/zai-backend/milestones/50 -f due_on="$ORIG" --jq '"restored: \(.due_on)"'
