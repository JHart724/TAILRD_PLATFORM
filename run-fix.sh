#!/bin/bash
# Fix all key={index} anti-patterns in React .tsx files

BASE="C:/Users/JHart/OneDrive/Desktop/TAILRD_PLATFORM-main"
SCRIPT="$BASE/fix-keys.awk"
TOTAL_FILES=0
TOTAL_FIXES=0

# Find all .tsx files under src/ that contain key={index|idx|i}
while IFS= read -r file; do
    if grep -qE 'key=\{(index|idx|i)\}' "$file" 2>/dev/null; then
        # Run awk, capture fixed content and fix count
        tmpfile=$(mktemp)
        fixes=$(awk -f "$SCRIPT" "$file" > "$tmpfile" 2>&1 >/dev/null)
        # Actually need to capture stderr separately
        awk -f "$SCRIPT" "$file" > "$tmpfile" 2>/tmp/fixcount.txt
        fixes=$(cat /tmp/fixcount.txt)

        if [ "$fixes" -gt 0 ] 2>/dev/null; then
            cp "$tmpfile" "$file"
            TOTAL_FILES=$((TOTAL_FILES + 1))
            TOTAL_FIXES=$((TOTAL_FIXES + fixes))
            echo "Fixed $fixes instance(s) in $(basename "$file")"
        fi
        rm -f "$tmpfile"
    fi
done < <(find "$BASE/src" -name "*.tsx" -type f)

echo ""
echo "Total files changed: $TOTAL_FILES"
echo "Total instances fixed: $TOTAL_FIXES"
