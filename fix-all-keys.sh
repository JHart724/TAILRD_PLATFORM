#!/bin/bash
# Comprehensive fix for key={index} anti-patterns
# Strategy: For each file, use context-aware sed replacements

BASE="C:/Users/JHart/OneDrive/Desktop/TAILRD_PLATFORM-main/src"
TOTAL=0

fix_file() {
    local file="$1"
    local count=0

    # Read file content for context analysis
    local content
    content=$(cat "$file")

    # Create temp file
    local tmp=$(mktemp)
    cp "$file" "$tmp"

    # Process each key={index|idx|i} occurrence
    # Use perl for context-aware replacement (perl is often available on git bash)
    perl -0777 -pe '
        # For each .map((var, indexVar) => ... key={indexVar} pattern
        # We need to find the map variable and determine proper key

        # Strategy: Look at the .map() line to get the item variable name,
        # then look at property accesses to determine best key field

        while (/\.map\(\((\w+),\s*(index|idx|i)\)\s*=>/g) {
            my $itemVar = $1;
            my $indexVar = $2;
            my $pos = pos($_);

            # This is just a marker - actual replacement happens below
        }
    ' "$tmp" > /dev/null 2>&1

    # Simpler approach: line-by-line context replacement using awk
    awk '
    BEGIN { fixes = 0 }

    # Track the most recent .map() call
    /\.map\(\(/ {
        mapLine = $0
        # Extract item variable name
        if (match($0, /\.map\(\(([a-zA-Z_][a-zA-Z0-9_]*)[\s,]/, arr)) {
            currentItemVar = arr[1]
        }
        # Extract index variable
        if (match($0, /\.map\(\([^,]+,\s*(index|idx|i)\)/, arr)) {
            currentIndexVar = arr[1]
        }
        # Check if this is a string array map
        isStringArray = 0
        if ($0 ~ /\[.*'\''.*'\''\s*,/) isStringArray = 1
        if ($0 ~ /\[.*".*"\s*,/) isStringArray = 1
    }

    # When we find key={index|idx|i}, replace based on context
    /key=\{(index|idx|i)\}/ {
        if (match($0, /key=\{(index|idx|i)\}/, karr)) {
            idxVar = karr[1]
        }

        # Determine replacement based on item variable properties
        # Look at current and next few lines for property access
        # For now, store this line for multi-line processing
    }

    { print }
    ' "$file" > "$tmp"

    # This approach is too complex for awk without multi-pass
    # Fallback to specific sed replacements per known pattern
    rm -f "$tmp"
}

# Instead, use a comprehensive approach:
# Read each file, find .map context, apply appropriate sed

process_with_context() {
    local file="$1"
    local fixes=0

    # Get all line numbers with key={index|idx|i}
    local key_lines
    key_lines=$(grep -n "key={index}\|key={idx}\|key={i}" "$file" | cut -d: -f1)

    for kline in $key_lines; do
        # Find the nearest .map() line above this key line
        local map_line=""
        local item_var=""
        local idx_var=""

        # Search backwards up to 30 lines for .map(
        for offset in $(seq 0 30); do
            local check_line=$((kline - offset))
            if [ $check_line -lt 1 ]; then break; fi

            local line_content
            line_content=$(sed -n "${check_line}p" "$file")

            if echo "$line_content" | grep -q "\.map((" ; then
                map_line="$line_content"
                # Extract item variable
                item_var=$(echo "$line_content" | grep -oP '\.map\(\((\w+)' | sed 's/\.map((//')
                # Extract index variable
                idx_var=$(echo "$line_content" | grep -oP ',\s*(index|idx|i)\)' | tr -d ', )' )
                break
            fi
        done

        if [ -z "$item_var" ]; then continue; fi

        # Determine the best key by looking at property accesses nearby
        local context_start=$((kline - 2))
        local context_end=$((kline + 20))
        local context
        context=$(sed -n "${context_start},${context_end}p" "$file")

        local best_key=""

        # Check for string array (item var used directly as {item})
        if echo "$context" | grep -q "{${item_var}}"; then
            # Check if no property access
            if ! echo "$context" | grep -q "${item_var}\."; then
                best_key="$item_var"
            fi
        fi

        # Check for _ (skeleton pattern)
        if [ "$item_var" = "_" ]; then
            best_key="\`skeleton-\${${idx_var}}\`"
        fi

        # If no key yet, look for properties
        if [ -z "$best_key" ]; then
            # Priority order of fields
            for field in id mrn name label title key factor type graft criterion category metric stage module code drg condition pathway step action status role specialty format report template indicator measure recommendation intervention procedure diagnosis phenotype trigger barrier gap risk score value description text quarter month year period check task member consult activity referral; do
                if echo "$context" | grep -q "${item_var}\.${field}\b\|${item_var}?\.${field}\b"; then
                    best_key="${item_var}.${field}"
                    break
                fi
            done
        fi

        # Fallback: use first property found
        if [ -z "$best_key" ]; then
            local first_prop
            first_prop=$(echo "$context" | grep -oP "${item_var}\??\.(\w+)" | head -1 | sed "s/${item_var}?*\.//" | head -1)
            if [ -n "$first_prop" ]; then
                best_key="${item_var}.${first_prop}"
            fi
        fi

        # Final fallback
        if [ -z "$best_key" ]; then
            best_key="\`item-\${${idx_var}}\`"
        fi

        # Apply the fix at this specific line
        local old_key="key={${idx_var}}"
        local new_key="key={${best_key}}"

        sed -i "${kline}s|${old_key}|${new_key}|" "$file"
        fixes=$((fixes + 1))
    done

    if [ $fixes -gt 0 ]; then
        echo "  $(basename "$file"): $fixes fix(es)"
        TOTAL=$((TOTAL + fixes))
    fi
}

echo "Fixing key={index} anti-patterns..."
echo ""

# Process all .tsx files with the pattern
while IFS= read -r file; do
    if grep -qlE 'key=\{(index|idx|i)\}' "$file" 2>/dev/null; then
        process_with_context "$file"
    fi
done < <(find "$BASE" -name "*.tsx" -type f 2>/dev/null)

echo ""
echo "Total instances fixed: $TOTAL"
