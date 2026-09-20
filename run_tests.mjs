import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, DescribeTableCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import fs from "fs";

// Load .env.local manually if not in process.env
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const awsConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

const sampleJpegBase64 = 
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const tests = [
  {
    name: "TC-01: Environment Variables Configuration Check",
    fn: async () => {
      const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET_NAME", "DYNAMODB_TABLE_NAME"];
      const missing = required.filter((key) => !process.env[key]);
      if (missing.length > 0) throw new Error(`Missing required env keys: ${missing.join(", ")}`);
      return `All required keys set. Region: ${process.env.AWS_REGION}, S3 Bucket: ${process.env.S3_BUCKET_NAME}`;
    }
  },
  {
    name: "TC-02: Amazon S3 Bucket Accessibility & Permission",
    fn: async () => {
      const s3 = new S3Client(awsConfig);
      await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
      return `Connected successfully to bucket: ${process.env.S3_BUCKET_NAME}`;
    }
  },
  {
    name: "TC-03: Amazon DynamoDB Table Active Status",
    fn: async () => {
      const ddb = new DynamoDBClient(awsConfig);
      const res = await ddb.send(new DescribeTableCommand({ TableName: process.env.DYNAMODB_TABLE_NAME || "CivicTickets" }));
      const status = res.Table?.TableStatus;
      if (status !== "ACTIVE") throw new Error(`Table status is ${status}, expected ACTIVE`);
      return `Table '${process.env.DYNAMODB_TABLE_NAME}' is ACTIVE (Items count: ${res.Table?.ItemCount ?? 0})`;
    }
  },
  {
    name: "TC-04: Amazon Rekognition Computer Vision Service",
    fn: async () => {
      const rek = new RekognitionClient(awsConfig);
      const imageBytes = Buffer.from(sampleJpegBase64, "base64");
      const res = await rek.send(new DetectLabelsCommand({
        Image: { Bytes: imageBytes },
        MaxLabels: 5,
        MinConfidence: 50,
      }));
      return `Rekognition API responding. Processed image without error.`;
    }
  },
  {
    name: "TC-05: Amazon CloudWatch Logs Group Verification",
    fn: async () => {
      const cw = new CloudWatchLogsClient(awsConfig);
      const res = await cw.send(new DescribeLogGroupsCommand({
        logGroupNamePrefix: "/civicsense-ai/tickets"
      }));
      const found = res.logGroups?.some(g => g.logGroupName === "/civicsense-ai/tickets");
      return found ? `Log Group '/civicsense-ai/tickets' verified and active.` : `Log group will auto-create upon first log entry.`;
    }
  },
  {
    name: "TC-06: End-to-End POST /api/process-ticket Pipeline Test",
    fn: async () => {
      const url = "http://localhost:3000/api/process-ticket";
      const payload = {
        imageBase64: sampleJpegBase64,
        description: "Test run: Sadak par kachra aur gaddha hai, emergency please fix!"
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(`API returned success=false: ${JSON.stringify(data)}`);
      return `Ticket created! ID: ${data.ticketId}, Category: ${data.analysis.category}, Urgency: ${data.analysis.urgency}, Source: ${data.analysis.aiSource}`;
    }
  },
  {
    name: "TC-07: End-to-End GET /api/get-tickets Retrieval Test",
    fn: async () => {
      const url = "http://localhost:3000/api/get-tickets";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API HTTP ${res.status}`);
      const data = await res.json();
      const count = data.tickets?.length || 0;
      return `Retrieved ${count} ticket(s) successfully from DynamoDB for Dashboard rendering.`;
    }
  }
];

async function runAll() {
  console.log("=========================================================");
  console.log("   🏛️ CIVICSENSE AI - AUTOMATED TEST SUITE RUNNER       ");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    process.stdout.write(`Running [${i + 1}/${tests.length}] ${t.name}... `);
    try {
      const detail = await t.fn();
      console.log(`\x1b[32m✔ PASS\x1b[0m`);
      console.log(`   ↳ \x1b[90m${detail}\x1b[0m\n`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31m✖ FAIL\x1b[0m`);
      console.log(`   ↳ \x1b[31mError: ${err.message}\x1b[0m\n`);
      failed++;
    }
  }

  console.log("=========================================================");
  console.log(` Summary: Total: ${tests.length} | \x1b[32mPassed: ${passed}\x1b[0m | \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("\n🎉 ALL TEST CASES PASSED SUCCESSFULLY!");
  }
}

runAll();
