const fs = require('fs');

// The problem: methodology notes like "... $1,200/patient ..." were corrupted by
// regex .replace() interpreting $1 as a backreference. This duplicated gap content.
// Fix: read the file line by line, detect corrupted methodologyNote lines, and replace them.

function fixFile(filePath, gapPrefix) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const result = [];
  let skipUntilNextGap = false;
  let lastGapId = null;
  let duplicateCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line contains a corrupted methodologyNote (contains id: 'xx-gap- mid-line)
    const gapIdInLine = line.match(new RegExp(`id: '(${gapPrefix}-[^']+)'`));

    if (gapIdInLine && line.includes('methodologyNote:')) {
      // This is a corrupted methodology note line - it contains a gap id mid-line
      // The pattern is: "methodologyNote: '... $X,XXX... = id: 'gap-id',"
      // We need to truncate at the gap id reference and continue skipping
      // until we find the clean version

      // Find where the methodology note text ends (before the id:)
      const idIdx = line.indexOf("id: '" + gapIdInLine[1]);
      // Truncate the corrupted part
      // Don't output this line - we'll skip the duplicate
      skipUntilNextGap = gapIdInLine[1];
      duplicateCount++;
      continue;
    }

    // Check if this line starts a non-corrupted methodologyNote that contains
    // a fragment like ",200/patient" from corrupted continuation
    if (skipUntilNextGap) {
      // Check if this line contains the gap id we're looking for (the real one)
      if (line.includes(`id: '${skipUntilNextGap}'`)) {
        // This is the start of a duplicate. Check if it's standalone (not in a methodologyNote)
        if (!line.includes('methodologyNote:')) {
          // This is a clean duplicate line - skip it and continue skipping
          continue;
        }
      }

      // Check for patterns that indicate we're still in duplicated content
      // like ",200/patient" or lines that are part of the duplicated gap object
      const isStillDuplicate = line.match(/^\s*(name:|category:|patientCount:|dollarOpportunity:|priority:|tag:|evidence:|cta:|detectionCriteria:|patients:|subcategories:|whyMissed:|whyTailrd:|safetyNote:|,\d+\/)/);

      if (isStillDuplicate) {
        continue; // Skip duplicate lines
      }

      // Check if we've reached a line that has the proper closing methodology note
      if (line.includes("Conversion rate:") || line.includes("Cost avoidance:")) {
        // This might be the end of the duplicate. Check if the next meaningful line starts normally
        skipUntilNextGap = false;
        // Don't output this line either (it's the tail of corrupted content)
        continue;
      }

      // If we hit something that doesn't look like duplicate content, stop skipping
      if (!line.trim().startsWith("'") && !line.trim().startsWith(',') &&
          !line.includes(skipUntilNextGap)) {
        skipUntilNextGap = false;
        // Fall through to add this line
      } else {
        continue; // Still in duplicate territory
      }
    }

    result.push(line);
  }

  if (duplicateCount > 0) {
    console.log(`Removed ${duplicateCount} duplicate fragments from ${filePath}`);
    fs.writeFileSync(filePath, result.join('\n'));
  }

  // Verify
  const content = fs.readFileSync(filePath, 'utf8');
  const count = (content.match(new RegExp(`id: '${gapPrefix}`, 'g')) || []).length;
  console.log(`Gap count after dedup: ${count}`);
  return count;
}

console.log('=== Fixing HF file ===');
fixFile('src/ui/heartFailure/components/clinical/hfGapData.ts', 'hf-gap');

console.log('\n=== Fixing EP file ===');
fixFile('src/ui/electrophysiology/components/clinical/EPClinicalGapDetectionDashboard.tsx', 'ep-gap');
