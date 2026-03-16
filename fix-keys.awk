#!/usr/bin/awk -f

# This AWK script fixes key={index|idx|i} anti-patterns in React .map() calls
# It reads a file, finds .map() contexts, and replaces index-based keys with stable keys

BEGIN {
    # Priority list of fields to use as keys
    split("id,mrn,patientId,patient_id,name,label,title,key,factor,type,graft,criterion,category,metric,stage,module,code,drg,drgCode,condition,therapy,medication,drug,device,pathway,step,action,status,level,tier,role,specialty,department,provider,physician,format,report,template,indicator,measure,recommendation,intervention,procedure,diagnosis,phenotype,trigger,barrier,gap,risk,finding,result,outcome,score,value,description,text,heading,subtitle,quarter,month,year,period,check,task,member,consult,activity,referral,topic,question,answer,alertId,alertType,componentName,metricName,perm,reason,alternative,implication,guideline,criterion,rec,alt,med,allergy,vital,lab,conn,connection,evidence,related,treatment", priorityFields, ",")
    priorityCount = split("id,mrn,patientId,patient_id,name,label,title,key,factor,type,graft,criterion,category,metric,stage,module,code,drg,drgCode,condition,therapy,medication,drug,device,pathway,step,action,status,level,tier,role,specialty,department,provider,physician,format,report,template,indicator,measure,recommendation,intervention,procedure,diagnosis,phenotype,trigger,barrier,gap,risk,finding,result,outcome,score,value,description,text,heading,subtitle,quarter,month,year,period,check,task,member,consult,activity,referral,topic,question,answer,alertId,alertType,componentName,metricName,perm,reason,alternative,implication,guideline,criterion,rec,alt,med,allergy,vital,lab,conn,connection,evidence,related,treatment", pList, ",")

    fixCount = 0
}

{
    lines[NR] = $0
    lineCount = NR
}

END {
    # Process all lines
    for (i = 1; i <= lineCount; i++) {
        line = lines[i]

        # Check if this line has key={index} or key={idx} or key={i}
        if (match(line, /key=\{(index|idx|i)\}/, keyMatch)) {
            indexVar = keyMatch[1]

            # Find the .map() context by searching backwards
            mapFound = 0
            itemVar = ""
            isDestructured = 0
            destructuredFields = ""

            for (j = i; j >= 1 && j >= i-30; j--) {
                # Match .map((varName, indexName) =>
                if (match(lines[j], /\.map\(\(([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>/, mapMatch)) {
                    itemVar = mapMatch[1]
                    mapIndexVar = mapMatch[2]
                    mapFound = 1
                    mapLine = j
                    break
                }
                # Match .map((varName) => with no index
                if (match(lines[j], /\.map\(\(([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>/, mapMatch)) {
                    itemVar = mapMatch[1]
                    mapFound = 1
                    mapLine = j
                    break
                }
                # Match destructured .map(({ field1, field2 }, index) =>
                if (match(lines[j], /\.map\(\(\{([^}]+)\}\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>/, mapMatch)) {
                    isDestructured = 1
                    destructuredFields = mapMatch[1]
                    mapIndexVar = mapMatch[2]
                    mapFound = 1
                    mapLine = j
                    break
                }
            }

            if (!mapFound) {
                # Cannot find map context, use item-${index} fallback
                newKey = "key={`item-${" indexVar "}`}"
                gsub(/key=\{(index|idx|i)\}/, newKey, lines[i])
                fixCount++
                continue
            }

            # Determine the best key
            bestKey = ""

            if (itemVar == "_") {
                # Skeleton pattern: [...Array(N)].map((_, i) => ...)
                bestKey = "`skeleton-${" indexVar "}`"
            } else if (isDestructured) {
                # Use first destructured field that matches priority
                n = split(destructuredFields, dFields, /\s*,\s*/)
                for (p = 1; p <= priorityCount; p++) {
                    for (d = 1; d <= n; d++) {
                        # Handle renamed fields like "original: renamed"
                        gsub(/\s*:.*/, "", dFields[d])
                        gsub(/^\s+|\s+$/, "", dFields[d])
                        if (dFields[d] == pList[p]) {
                            bestKey = dFields[d]
                            break
                        }
                    }
                    if (bestKey != "") break
                }
                if (bestKey == "") {
                    gsub(/\s*:.*/, "", dFields[1])
                    gsub(/^\s+|\s+$/, "", dFields[1])
                    bestKey = dFields[1]
                }
            } else {
                # Check if it's a string array (item is used directly as {item} in JSX)
                isStringArr = 0

                # Look for array of strings pattern: ['str1', 'str2'].map(
                for (j = mapLine; j >= 1 && j >= mapLine-15; j--) {
                    if (lines[j] ~ /\[\s*'[^']*'\s*,/ || lines[j] ~ /\[\s*"[^"]*"\s*,/) {
                        # Check that this array doesn't have objects
                        hasObj = 0
                        for (k = j; k <= mapLine; k++) {
                            if (lines[k] ~ /\{[^}]*:/) {
                                hasObj = 1
                                break
                            }
                        }
                        if (!hasObj) {
                            isStringArr = 1
                        }
                        break
                    }
                }

                if (isStringArr) {
                    bestKey = itemVar
                } else {
                    # Find properties of itemVar used in the block
                    # Search from the key line forward and backward
                    delete foundProps
                    propCount = 0
                    searchStart = (mapLine > i-5) ? mapLine : i-5
                    searchEnd = (i+40 < lineCount) ? i+40 : lineCount

                    for (j = searchStart; j <= searchEnd; j++) {
                        # Match itemVar.property or itemVar?.property
                        tmpLine = lines[j]
                        while (match(tmpLine, itemVar "\\??\\.([a-zA-Z_][a-zA-Z0-9_]*)", propMatch)) {
                            prop = propMatch[1]
                            if (!(prop in foundProps)) {
                                foundProps[prop] = ++propCount
                            }
                            tmpLine = substr(tmpLine, RSTART + RLENGTH)
                        }
                    }

                    # Try priority fields
                    for (p = 1; p <= priorityCount; p++) {
                        if (pList[p] in foundProps) {
                            bestKey = itemVar "." pList[p]
                            break
                        }
                    }

                    # If no priority field found, use first two props as compound key
                    if (bestKey == "" && propCount >= 2) {
                        # Get first two properties in order found
                        first = ""
                        second = ""
                        for (prop in foundProps) {
                            if (foundProps[prop] == 1) first = prop
                            if (foundProps[prop] == 2) second = prop
                        }
                        if (first != "" && second != "") {
                            bestKey = "`${" itemVar "." first "}-${" itemVar "." second "}`"
                        }
                    }

                    if (bestKey == "" && propCount >= 1) {
                        for (prop in foundProps) {
                            if (foundProps[prop] == 1) {
                                bestKey = itemVar "." prop
                                break
                            }
                        }
                    }

                    if (bestKey == "") {
                        bestKey = "`item-${" indexVar "}`"
                    }
                }
            }

            # Replace key={index} with key={bestKey}
            oldKey = "key={" indexVar "}"
            newKey = "key={" bestKey "}"
            gsub(oldKey, newKey, lines[i])
            fixCount++
        }
    }

    # Output all lines
    for (i = 1; i <= lineCount; i++) {
        if (i < lineCount)
            print lines[i]
        else
            printf "%s", lines[i]
    }

    # Report fixes to stderr
    print fixCount > "/dev/stderr"
}
