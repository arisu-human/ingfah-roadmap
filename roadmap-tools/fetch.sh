#!/bin/bash
# Refetch the real milestone data the page uses, for offline logic tests.
cd "$(dirname "$0")"
python3 - <<'PY'
import re
s = open('../ingfah-roadmap/index.html').read()
js = re.search(r'<script type="module">(.*?)</script>', s, re.S).group(1)
ms = re.search(r'const MS_FIELDS = `(.*?)`', js, re.S).group(1)
for name, state in [('q-open.graphql','states:OPEN'),
                    ('q-closed.graphql','states:CLOSED, orderBy:{field:DUE_DATE, direction:DESC}')]:
    open(name,'w').write('query($owner:String!,$name:String!,$ms:Int!,$iss:Int!){ '
      'repository(owner:$owner,name:$name){ milestones(first:$ms, %s){ nodes{ %s } } } }' % (state, ms))
PY
rm -f raw.ndjson
for r in zai-backend zai-frontend zai-bo-frontend ingfah-rag ingfah-dev-docs zai-docs; do
  gh api graphql -F query=@q-open.graphql -F owner=100x-fi -F name=$r -F ms=30 -F iss=70 \
    --jq ".data.repository.milestones.nodes[] | . + {repo:\"$r\", isClosed:false}" >> raw.ndjson
  gh api graphql -F query=@q-closed.graphql -F owner=100x-fi -F name=$r -F ms=20 -F iss=70 \
    --jq ".data.repository.milestones.nodes[] | . + {repo:\"$r\", isClosed:true}" >> raw.ndjson
done
wc -l raw.ndjson
