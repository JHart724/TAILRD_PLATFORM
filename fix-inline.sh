#!/bin/bash
BASE="C:/Users/JHart/OneDrive/Desktop/TAILRD_PLATFORM-main/src"
F=0
T=0
for file in $(grep -rl 'key={index}\|key={idx}\|key={i}' "$BASE" --include="*.tsx"); do
  fc=0
  for kl in $(grep -n 'key={index}\|key={idx}\|key={i}' "$file" | cut -d: -f1); do
    kc=$(sed -n "${kl}p" "$file")
    iv=""
    [[ "$kc" == *"key={index}"* ]] && iv="index"
    [[ "$kc" == *"key={idx}"* ]] && iv="idx"
    [[ "$kc" == *"key={i}"* ]] && iv="i"
    [ -z "$iv" ] && continue
    ss=$((kl>30?kl-30:1))
    ctx=$(sed -n "${ss},${kl}p" "$file")
    ml=$(echo "$ctx" | grep '\.map((' | tail -1)
    [ -z "$ml" ] && continue
    itemv=$(echo "$ml" | sed -n 's/.*\.map((\([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/p')
    [ -z "$itemv" ] && continue
    if [ "$itemv" = "_" ]; then
      sed -i "${kl}s/key={${iv}}/key={\`skeleton-\${${iv}}\`}/" "$file"; fc=$((fc+1)); continue
    fi
    sa=0
    if echo "$ctx" | grep -q "\\[.*'[^']*'"; then
      if ! echo "$ctx" | grep -q '{[^}]*:'; then sa=1; fi
    fi
    if [ $sa -eq 1 ]; then
      sed -i "${kl}s/key={${iv}}/key={${itemv}}/" "$file"; fc=$((fc+1)); continue
    fi
    ee=$((kl+25))
    actx=$(sed -n "${kl},${ee}p" "$file")
    bk=""
    for f in id mrn patientId name label title key factor type graft criterion criteria category metric stage module code drg drgCode condition therapy medication drug device pathway step action status level role specialty format report template indicator measure recommendation intervention procedure diagnosis phenotype trigger barrier gap risk score value description text quarter month year period check task member consult consultation activity referral alertType facility severity urgency section zone perm reason alternative guideline implication; do
      if echo "$ctx $actx" | grep -qw "${itemv}\.\b*${f}\b\|${itemv}?\.${f}"; then
        bk="${itemv}.${f}"; break
      fi
    done
    if [ -z "$bk" ]; then
      fp=$(echo "$ctx $actx" | grep -oP "${itemv}\??\.(\w+)" | head -1 | sed "s/${itemv}\??\.//")
      [ -n "$fp" ] && bk="${itemv}.${fp}"
    fi
    [ -z "$bk" ] && bk="\`item-\${${iv}}\`"
    sed -i "${kl}s|key={${iv}}|key={${bk}}|" "$file"
    fc=$((fc+1))
  done
  [ $fc -gt 0 ] && { F=$((F+1)); T=$((T+fc)); echo "$(basename $file): $fc"; }
done
echo "Files: $F, Fixes: $T"
