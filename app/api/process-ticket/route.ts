import { NextResponse } from "next/server";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { logToCloudWatch } from "../../lib/cloudwatch";

// AWS CONFIGURATION (Supports standard AWS_ and Amplify-friendly APP_AWS_ prefixes)
function getAwsConfig() {
  const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return {
      region,
      credentials: { accessKeyId, secretAccessKey },
    };
  }
  return { region };
}

// ============================================================
// HELPER: Upload image to AWS S3
// ============================================================
async function uploadToS3(imageBase64: string, ticketId: string) {
  const config = getAwsConfig();
  const s3Client = new S3Client(config);
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const s3Key = `tickets/${ticketId}.jpg`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    Body: imageBuffer,
    ContentType: "image/jpeg",
  }));

  return `https://${process.env.S3_BUCKET_NAME}.s3.${config.region}.amazonaws.com/${s3Key}`;
}

// ============================================================
// AI LAYER 1: Amazon Bedrock (Primary - when quota available)
// ============================================================
async function analyzeWithBedrock(imageBase64: string, description: string) {
  const bedrockClient = new BedrockRuntimeClient(getAwsConfig());
  const bedrockPrompt = `You are an expert municipal grievance AI for Indian cities.
Analyze this civic issue image and description: "${description}".
Respond in STRICT JSON (no markdown) with: "category", "urgency" (High/Medium/Low), "department", "summary".`;

  const imageBuffer = Buffer.from(imageBase64, "base64");

  const response = await bedrockClient.send(new ConverseCommand({
    modelId: "us.amazon.nova-lite-v1:0",
    messages: [{
      role: "user",
      content: [
        { image: { format: "jpeg", source: { bytes: imageBuffer } } },
        { text: bedrockPrompt },
      ],
    }],
    inferenceConfig: { maxTokens: 500 },
  }));

  const rawText = response.output?.message?.content?.[0]?.text || "{}";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Bedrock response");
  return { ...JSON.parse(jsonMatch[0]), aiSource: "aws-bedrock-nova-lite" };
}

// ============================================================
// AI LAYER 2: Amazon Rekognition (Image AI - separate quota)
// ============================================================
async function analyzeWithRekognition(imageBase64: string, description: string) {
  const rekClient = new RekognitionClient(getAwsConfig());
  const imageBuffer = Buffer.from(imageBase64, "base64");

  const response = await rekClient.send(new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MaxLabels: 15,
    MinConfidence: 60,
  }));

  const labels = (response.Labels || []).map(l => l.Name?.toLowerCase() || "");
  const allText = [...labels, description.toLowerCase()].join(" ");

  // Intelligent category mapping based on detected image labels + text
  const categoryMap = [
    { match: ["garbage", "trash", "litter", "waste", "dump", "pollution", "plastic", "debris", "kachra", "kuda", "safai", "dustbin", "bag"], category: "Sanitation / Garbage", department: "Waste Management Authority", baseUrgency: "High" },
    { match: ["pothole", "road", "crack", "asphalt", "pavement", "street", "highway", "gaddha", "sadak", "sarak", "gravel"], category: "Roads / Infrastructure", department: "Public Works Department", baseUrgency: "Medium" },
    { match: ["light", "lamp", "bulb", "pole", "electric", "wire", "cable", "power", "bijli", "streetlight"], category: "Electricity / Streetlights", department: "Electrical Maintenance Division", baseUrgency: "Medium" },
    { match: ["water", "flood", "drain", "pipe", "sewage", "leak", "puddle", "overflow", "paani", "nala", "naali"], category: "Water / Drainage", department: "Water Supply & Sewerage Board", baseUrgency: "High" },
    { match: ["tree", "branch", "park", "garden", "plant", "fallen", "ped", "grass", "vegetation"], category: "Parks / Trees", department: "Horticulture Department", baseUrgency: "Low" },
    { match: ["traffic", "signal", "sign", "vehicle", "car", "parking", "jam", "congestion"], category: "Traffic / Signals", department: "Traffic Management Authority", baseUrgency: "Medium" },
    { match: ["building", "wall", "construction", "rubble", "demolition", "encroachment", "illegal"], category: "Building / Construction", department: "Town Planning Department", baseUrgency: "Medium" },
    { match: ["animal", "dog", "stray", "cow", "cattle", "snake"], category: "Stray Animals", department: "Animal Control Authority", baseUrgency: "High" },
  ];

  let matched = categoryMap.find(c => c.match.some(keyword => allText.includes(keyword)));
  if (!matched) {
    matched = { match: [], category: "General Civic Issue", department: "Municipal Commissioner Office", baseUrgency: "Medium" };
  }

  // Urgency boost from description keywords
  const highWords = ["danger", "khatarnak", "urgent", "emergency", "accident", "collapse", "blocking", "injured", "hazard", "fire"];
  let urgency = matched.baseUrgency;
  if (highWords.some(w => allText.includes(w))) urgency = "High";

  const detectedLabels = (response.Labels || []).slice(0, 5).map(l => l.Name).join(", ");
  const summary = `[AI Vision: ${detectedLabels}] ${matched.category} issue reported. ${description.substring(0, 80)}. Routed to ${matched.department}.`;

  return {
    category: matched.category,
    urgency,
    department: matched.department,
    summary,
    detectedLabels,
    aiSource: "aws-rekognition",
  };
}

// ============================================================
// AI LAYER 3: Smart Keyword Fallback (No AWS AI needed)
// ============================================================
function smartFallbackAnalysis(description: string) {
  const desc = description.toLowerCase();
  const categoryMap = [
    { keywords: ["pothole", "road", "gaddha", "sadak", "crack"], category: "Roads / Infrastructure", department: "Public Works Department" },
    { keywords: ["garbage", "kachra", "waste", "dump", "kuda", "safai", "trash"], category: "Sanitation / Garbage", department: "Waste Management Authority" },
    { keywords: ["light", "bijli", "streetlight", "lamp", "electricity", "power"], category: "Electricity / Streetlights", department: "Electrical Maintenance Division" },
    { keywords: ["water", "paani", "leak", "pipe", "drain", "sewer", "flood"], category: "Water / Drainage", department: "Water Supply & Sewerage Board" },
    { keywords: ["tree", "ped", "branch", "park", "fallen"], category: "Parks / Trees", department: "Horticulture Department" },
    { keywords: ["traffic", "signal", "sign", "parking"], category: "Traffic / Signals", department: "Traffic Management Authority" },
  ];

  let matched = categoryMap.find(c => c.keywords.some(k => desc.includes(k)));
  if (!matched) matched = { keywords: [], category: "General Civic Issue", department: "Municipal Commissioner Office" };

  const highWords = ["danger", "khatarnak", "urgent", "emergency", "accident"];
  let urgency = "Medium";
  if (highWords.some(w => desc.includes(w))) urgency = "High";

  return {
    category: matched.category,
    urgency,
    department: matched.department,
    summary: `${matched.category} issue reported: "${description.substring(0, 100)}". Assigned to ${matched.department}.`,
    aiSource: "smart-fallback",
  };
}

// ============================================================
// HELPER: Save ticket to DynamoDB
// ============================================================
async function saveToDynamoDB(ticket: any) {
  const dynamoClient = new DynamoDBClient(getAwsConfig());
  await dynamoClient.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME || "CivicTickets",
    Item: {
      ticketId: { S: ticket.ticketId },
      imageUrl: { S: ticket.imageUrl || "" },
      category: { S: ticket.category },
      urgency: { S: ticket.urgency },
      department: { S: ticket.department },
      summary: { S: ticket.summary },
      aiSource: { S: ticket.aiSource || "unknown" },
      status: { S: "Open" },
      createdAt: { S: new Date().toISOString() },
    },
  }));
}

// ============================================================
// MAIN API: 3-Layer AI Pipeline (Bedrock → Rekognition → Fallback)
// ============================================================
export async function POST(req: Request) {
  try {
    const { imageBase64, description } = await req.json();
    const ticketId = uuidv4();

    // MOCK MODE
    if (process.env.MOCK_MODE === "true") {
      await new Promise(res => setTimeout(res, 1500));
      return NextResponse.json({
        success: true, ticketId,
        analysis: { category: "Roads", urgency: "High", department: "Public Works", summary: "Mock: Pothole detected.", aiSource: "mock" },
      });
    }

    // Step 1: Upload image to S3
    let imageUrl = "";
    try {
      imageUrl = await uploadToS3(imageBase64, ticketId);
      console.log("✅ Image uploaded to S3");
      await logToCloudWatch(ticketId, "S3_UPLOAD_SUCCESS", { imageUrl });
    } catch (s3Err: any) {
      console.error("⚠️ S3 Upload failed:", s3Err.message);
      await logToCloudWatch(ticketId, "S3_UPLOAD_FAILED", { error: s3Err.message });
      imageUrl = `upload-failed/${ticketId}`;
    }

    // Step 2: 3-Layer AI Analysis Pipeline
    let aiAnalysis;

    // Layer 1: Try Bedrock (most intelligent)
    try {
      aiAnalysis = await analyzeWithBedrock(imageBase64, description);
      console.log("✅ AI Layer 1: AWS Bedrock analysis successful");
      await logToCloudWatch(ticketId, "AI_BEDROCK_SUCCESS", { category: aiAnalysis.category, urgency: aiAnalysis.urgency });
    } catch (bedrockErr: any) {
      console.warn(`⚠️ Bedrock unavailable (${bedrockErr.name}), trying Rekognition...`);
      await logToCloudWatch(ticketId, "AI_BEDROCK_FALLBACK", { reason: bedrockErr.name });

      // Layer 2: Try Rekognition (image label detection)
      try {
        aiAnalysis = await analyzeWithRekognition(imageBase64, description);
        console.log("✅ AI Layer 2: AWS Rekognition analysis successful");
        await logToCloudWatch(ticketId, "AI_REKOGNITION_SUCCESS", { category: aiAnalysis.category, labels: aiAnalysis.detectedLabels });
      } catch (rekErr: any) {
        console.warn(`⚠️ Rekognition failed (${rekErr.name}), using smart fallback...`);
        await logToCloudWatch(ticketId, "AI_FALLBACK_USED", { reason: rekErr.name });

        // Layer 3: Smart keyword fallback (always works)
        aiAnalysis = smartFallbackAnalysis(description);
        console.log("✅ AI Layer 3: Smart fallback analysis completed");
      }
    }

    // Step 3: Save to DynamoDB
    await saveToDynamoDB({ ticketId, imageUrl, ...aiAnalysis });
    console.log("✅ Ticket saved to DynamoDB:", ticketId);
    await logToCloudWatch(ticketId, "TICKET_CREATED", { category: aiAnalysis.category, urgency: aiAnalysis.urgency, department: aiAnalysis.department, aiSource: aiAnalysis.aiSource });

    return NextResponse.json({ success: true, ticketId, analysis: aiAnalysis });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "System failure" }, { status: 500 });
  }
}
