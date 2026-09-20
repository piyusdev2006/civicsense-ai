import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

import fs from "fs";

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
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

async function setupAWS() {
  console.log("Starting AWS Setup...");
  
  // 1. Create S3 Bucket
  const s3 = new S3Client(awsConfig);
  const bucketName = `civicsense-uploads-${Date.now()}`;
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`[SUCCESS] S3 Bucket created: ${bucketName}`);
  } catch (e) {
    console.error("[ERROR] Failed to create S3 Bucket:", e.message);
  }

  // 2. Create DynamoDB Table
  const dynamodb = new DynamoDBClient(awsConfig);
  const tableName = "CivicTickets";
  try {
    await dynamodb.send(new CreateTableCommand({
      TableName: tableName,
      KeySchema: [{ AttributeName: "ticketId", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "ticketId", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST"
    }));
    console.log(`[SUCCESS] DynamoDB Table created: ${tableName}`);
  } catch (e) {
    if (e.name === "ResourceInUseException") {
      console.log(`[INFO] DynamoDB Table ${tableName} already exists.`);
    } else {
      console.error("[ERROR] Failed to create DynamoDB Table:", e.message);
    }
  }

  console.log("=== SETUP COMPLETE ===");
  console.log(`BUCKET_NAME=${bucketName}`);
}

setupAWS();
