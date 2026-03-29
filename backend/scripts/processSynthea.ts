import * as fs from "fs";
import * as path from "path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

dotenv.config();

const BUCKET = "tailrd-cardiovascular-datasets-863518424332";
const PREFIX = "synthea/nyc-population-2026/fhir/";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function listS3Files(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: token,
    });
    const res = await s3.send(cmd);
    for (const obj of res.Contents || []) {
      if (obj.Key?.endsWith(".json")) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function getS3File(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const useS3 = process.argv.includes("--s3");
  console.log("TAILRD Synthea Processor");
  console.log("========================");

  if (useS3) {
    console.log("Mode: S3");
    console.log(`Bucket: ${BUCKET}`);
    console.log("Listing FHIR bundles...");
    const keys = await listS3Files();
    console.log(`Found ${keys.length} FHIR bundles`);
    let processed = 0;
    for (const key of keys) {
      try {
        const content = await getS3File(key);
        const bundle = JSON.parse(content);
        processed++;
        if (processed % 1000 === 0) {
          console.log(`Processed ${processed}/${keys.length} patients...`);
        }
      } catch (err) {
        console.error(`Failed: ${key}`, err);
      }
    }
    console.log(`\nComplete. Processed ${processed} patients.`);
  } else {
    const dir = process.argv[2] || path.join(__dirname, "../../../synthea/output/fhir");
    console.log(`Mode: Local`);
    console.log(`Directory: ${dir}`);
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    console.log(`Found ${files.length} FHIR bundles`);
  }
}

main().catch(console.error);
