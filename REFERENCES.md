# 📚 Project References & Open-Source Acknowledgements

> CivicSense AI incorporates architectural patterns and best practices from the following repositories.

## Core References

1. **[affaan-m/ecc](https://github.com/affaan-m/ecc)**
   - **Applied Function:** Backend Architecture & Clean Code
   - **Usage:** Strict separation of concerns in API routes — S3 upload, Bedrock AI, Rekognition analysis, and DynamoDB logging are isolated into testable helper functions.

2. **[voltagent/awesome-design-md](https://github.com/voltagent/awesome-design-md)**
   - **Applied Function:** UI/UX Polish & Documentation Standards
   - **Usage:** Guided frontend visual hierarchy, color accessibility (Red=High, Yellow=Medium, Green=Low urgency), and markdown documentation formatting.

3. **[dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail)**
   - **Applied Function:** Lightweight Styling & CSS Optimization
   - **Usage:** Optimized Tailwind CSS structure with minimal DOM depth and reusable, modular class strings.

## Additional Best Practices

4. **[shadcn-ui/ui](https://github.com/shadcn-ui/ui)**
   - **Applied Function:** Accessible Component Design
   - **Usage:** Inspired accessible forms, buttons, and loading states for inclusive citizen experience.

5. **[vercel/next.js](https://github.com/vercel/next.js/tree/canary/examples)**
   - **Applied Function:** App Router & Serverless API Optimization
   - **Usage:** Optimal Edge/Serverless function patterns and secure environment variable handling.

6. **[aws-samples/aws-serverless-workshops](https://github.com/aws-samples/aws-serverless-workshops)**
   - **Applied Function:** Cloud-Native Data Flow
   - **Usage:** DynamoDB table structure (Partition Keys), S3 object storage patterns, and CloudWatch logging best practices.

## AWS Documentation References

7. **[Amazon Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html)**
   - Used for multimodal AI inference (image + text) with Nova Lite model.

8. **[Amazon Rekognition DetectLabels](https://docs.aws.amazon.com/rekognition/latest/dg/labels-detect-labels-image.html)**
   - Used for computer vision label detection in grievance photos.

9. **[Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)**
   - Used for centralized pipeline event logging and monitoring.

---

*See also: [README.md](./README.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) | [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)*
