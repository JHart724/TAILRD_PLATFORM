#!/bin/bash
# Smart key={index} fixer - context-aware replacement
# Uses grep + sed for each file

BASE="C:/Users/JHart/OneDrive/Desktop/TAILRD_PLATFORM-main/src"
FIXES=0
FILES_CHANGED=0

process_file() {
    local file="$1"
    local file_fixes=0

    # Get line numbers with key={index|idx|i}
    local lines=$(grep -n 'key={index}\|key={idx}\|key={i}' "$file" | cut -d: -f1)

    for kline in $lines; do
        # Get the key line content
        local key_content=$(sed -n "${kline}p" "$file")

        # Determine which index var is used
        local idx_var=""
        if echo "$key_content" | grep -q 'key={index}'; then idx_var="index"; fi
        if echo "$key_content" | grep -q 'key={idx}'; then idx_var="idx"; fi
        if echo "$key_content" | grep -q 'key={i}'; then idx_var="i"; fi

        if [ -z "$idx_var" ]; then continue; fi

        # Search backwards for .map( to find item variable
        local item_var=""
        local is_string_arr=0
        local is_skeleton=0

        local search_start=$((kline > 30 ? kline - 30 : 1))
        local context=$(sed -n "${search_start},${kline}p" "$file")

        # Find last .map(( in context
        local map_line=$(echo "$context" | grep '\.map((' | tail -1)

        if [ -z "$map_line" ]; then continue; fi

        # Extract item variable from .map((varName, ...
        item_var=$(echo "$map_line" | sed -n 's/.*\.map((\([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/p')

        if [ -z "$item_var" ]; then continue; fi

        # Check skeleton pattern
        if [ "$item_var" = "_" ]; then
            is_skeleton=1
        fi

        # Check if string array (look for ['str'].map pattern)
        if echo "$context" | grep -q "\\[.*'[^']*'.*\\]"; then
            # Check no object literal in array
            if ! echo "$context" | grep -q '{[^}]*:'; then
                is_string_arr=1
            fi
        fi

        # Get context after key line for property detection
        local context_end=$((kline + 25))
        local after_context=$(sed -n "${kline},${context_end}p" "$file")
        local full_context="$context
$after_context"

        local best_key=""

        if [ $is_skeleton -eq 1 ]; then
            best_key="\`skeleton-\${${idx_var}}\`"
        elif [ $is_string_arr -eq 1 ]; then
            best_key="$item_var"
        else
            # Try to find best property
            for field in id mrn patientId name label title key factor type graft criterion category metric stage module code drg drgCode condition therapy medication drug device pathway step action status level role specialty format report template indicator measure recommendation intervention procedure diagnosis phenotype trigger barrier gap risk score value description text quarter month year period check task member consult activity referral alertType facility severity urgency criteria perm reason alternative guideline implication zone section; do
                if echo "$full_context" | grep -q "${item_var}\.\b${field}\b\|${item_var}?\.${field}"; then
                    best_key="${item_var}.${field}"
                    break
                fi
            done

            # If no field found, try to extract any property access
            if [ -z "$best_key" ]; then
                local first_prop=$(echo "$full_context" | grep -oP "${item_var}\??\.(\w+)" | head -1 | sed "s/${item_var}\??\.//")
                if [ -n "$first_prop" ]; then
                    best_key="${item_var}.${first_prop}"
                fi
            fi

            # Fallback
            if [ -z "$best_key" ]; then
                best_key="\`item-\${${idx_var}}\`"
            fi
        fi

        # Apply replacement on this line only
        local old_pattern="key={${idx_var}}"
        local new_pattern="key={${best_key}}"

        # Use sed to replace on the specific line
        sed -i "${kline}s|key={${idx_var}}|key={${best_key}}|" "$file"
        file_fixes=$((file_fixes + 1))
    done

    if [ $file_fixes -gt 0 ]; then
        FILES_CHANGED=$((FILES_CHANGED + 1))
        FIXES=$((FIXES + file_fixes))
        echo "  $(echo "$file" | sed "s|$BASE/||"): $file_fixes fix(es)"
    fi
}

echo "Fixing key={index} anti-patterns in $BASE..."
echo ""

# Find and process all files
for file in $(grep -rl 'key={index}\|key={idx}\|key={i}' "$BASE" --include="*.tsx"); do
    process_file "$file"
done

echo ""
echo "Files changed: $FILES_CHANGED"
echo "Total instances fixed: $FIXES"
