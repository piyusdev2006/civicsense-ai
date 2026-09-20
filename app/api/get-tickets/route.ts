import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

export async function GET() {
  if (process.env.MOCK_MODE === "true") {
    return NextResponse.json({
      tickets: [
        { ticketId: "1", category: "Sanitation", urgency: "High", department: "Waste Mgmt", summary: "Hazardous garbage overflow on main street.", aiSource: "mock" },
        { ticketId: "2", category: "Roads", urgency: "Medium", department: "Public Works", summary: "Deep pothole causing traffic issues.", aiSource: "mock" },
      ],
    });
  }

  try {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "DUMMY",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "DUMMY",
      },
    });

    const data = await dynamoClient.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME || "CivicTickets" }));
    const tickets = (data.Items || []).map(item => ({
      ticketId: item.ticketId?.S || "",
      category: item.category?.S || "Unknown",
      urgency: item.urgency?.S || "Medium",
      department: item.department?.S || "Unknown",
      summary: item.summary?.S || "No summary",
      imageUrl: item.imageUrl?.S || "",
      aiSource: item.aiSource?.S || "unknown",
      status: item.status?.S || "Open",
      createdAt: item.createdAt?.S || "",
    }));

    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error("DB Fetch Error:", err);
    return NextResponse.json({ error: "Failed to fetch from DynamoDB: " + err.message }, { status: 500 });
  }
}
