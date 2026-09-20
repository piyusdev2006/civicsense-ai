import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const LOG_GROUP = "/civicsense-ai/tickets";

function getCwClient() {
  const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new CloudWatchLogsClient({ region, credentials: { accessKeyId, secretAccessKey } });
  }
  return new CloudWatchLogsClient({ region });
}

let logGroupReady = false;
const LOG_STREAM = `stream-${Date.now()}`;

async function ensureLogGroup() {
  if (logGroupReady) return;
  const client = getCwClient();
  try {
    await client.send(new CreateLogGroupCommand({ logGroupName: LOG_GROUP }));
  } catch (e: any) {
    if (e.name !== "ResourceAlreadyExistsException") console.warn("CW LogGroup:", e.message);
  }
  try {
    await client.send(new CreateLogStreamCommand({ logGroupName: LOG_GROUP, logStreamName: LOG_STREAM }));
  } catch (e: any) {
    if (e.name !== "ResourceAlreadyExistsException") console.warn("CW LogStream:", e.message);
  }
  logGroupReady = true;
}

export async function logToCloudWatch(ticketId: string, event: string, details: Record<string, any>) {
  if (process.env.MOCK_MODE === "true") return;

  try {
    await ensureLogGroup();
    const client = getCwClient();
    await client.send(new PutLogEventsCommand({
      logGroupName: LOG_GROUP,
      logStreamName: LOG_STREAM,
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify({ ticketId, event, ...details, timestamp: new Date().toISOString() }),
      }],
    }));
  } catch (e: any) {
    console.warn("CloudWatch log failed (non-critical):", e.message);
  }
}
