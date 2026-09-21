# Building CivicSense AI: How I Built a Multimodal Citizen Grievance Assistant on AWS

*How Indian cities can revolutionize municipal triage using Amazon Rekognition, Bedrock, DynamoDB, S3, and Amplify — built during the WeMakeDevs × AWS First Commit Hackathon.*

---

## 📌 The Real-World Problem: The "Black Hole" of Civic Grievances

Every monsoon, millions of commuters across India navigate dangerous potholes, overflowed drains, and broken streetlights. When a citizen tries to report these issues through traditional helplines or municipal websites, they face serious challenges:

**Category Confusion:** Citizens often don't know whether an issue belongs to the Public Works Department, Waste Management, or the Electricity Board.

**Vague Descriptions:** A complaint saying "there is water on the road" without clear context gets placed at the bottom of the pile.

**Lack of Urgency Assessment:** An emergency crater on a main highway gets queued behind minor cosmetic repairs on quiet streets.

As a result, important complaints sit unaddressed for weeks. I built **CivicSense AI** to solve this problem. A citizen simply uploads a photo and writes a single sentence in their local language. Multimodal AWS AI instantly analyzes the image, determines how urgent it is, creates a structured ticket, and automatically sends it to the correct municipal department dashboard.

---

## 🏗️ System Architecture: The 6 AWS Cloud Services

To ensure high reliability, speed, and low maintenance, CivicSense AI is built entirely on serverless AWS services:

**AWS Amplify:** Hosts the Next.js full-stack web application with continuous deployment from GitHub.

**Amazon Rekognition:** Uses computer vision to detect objects in the uploaded photo, such as puddles, potholes, garbage, or electrical wires.

**Amazon Bedrock (Nova Lite):** Provides multimodal reasoning to understand citizen descriptions and structure the final ticket.

**Amazon S3:** Safely and permanently stores the uploaded grievance photos.

**Amazon DynamoDB:** A fast NoSQL database that stores and fetches all complaint tickets in real time.

**Amazon CloudWatch:** Tracks system logs and ensures the entire pipeline is monitored end-to-end.

---

## 🏛️ CivicSense AI — Pura Flow Samjho

*Yeh section poore project ka step-by-step visual walkthrough hai. Har step mein ek diagram + explanation hai. Isko padh ke exactly pata chalega ki ek complaint submit hone ke baad AWS ke andar kya kya hota hai.*

---

### Step 0: Architecture — Big Picture

Pehle ek baar poori picture dekho. Citizen se lekar dashboard tak ka complete journey:

<!-- ============================================================ -->
<!-- 📷 IMAGE 1: Upload karo — Step 0 Architecture diagram        -->
<!-- (Dark flowchart: Citizen → AWS Cloud [AI Brain, S3,          -->
<!-- DynamoDB, CloudWatch] → Dashboard)                           -->
<!-- ============================================================ -->

---

### Step 1: Citizen Photo + Text Bhejta Hai

Citizen humari website kholega. Ushe ek clean form milti hai jisme sirf 2 cheezein hain — photo upload area aur ek description text box. Kisi bhi language mein likh sakte hain: Hindi, English, ya Hinglish.

<!-- ============================================================ -->
<!-- 📷 IMAGE 2: Upload karo — Step 1 diagram                     -->
<!-- (Citizen kachre ki photo → Frontend Base64 → API Route)      -->
<!-- ============================================================ -->

**Kya hota hai:**

- Citizen website kholega → form mein photo select karega (kachra, gaddha, tooti light, kuch bhi)
- Niche text mein likhega Hindi/English mein: *"Yahan bohot dino se kachra pada hai"*
- Submit dabayega → Frontend photo ko Base64 (text format) mein convert karke API ko bhej dega

> 💡 **Base64 kyun?** HTTP requests mein binary image directly nahi bhej sakte. Base64 encoding image ko text mein convert kar deti hai taaki JSON payload mein safely travel kar sake.

---

### Step 2: Photo Amazon S3 Mein Save Hoti Hai

Jaise hi API ko request milti hai, sabse pehla kaam photo ko permanently aur safely store karna hai.

<!-- ============================================================ -->
<!-- 📷 IMAGE 3: Upload karo — Step 2 diagram                     -->
<!-- (API Ticket ID banata hai → S3 Upload → Permanent URL        -->
<!-- + CloudWatch S3_UPLOAD_SUCCESS)                              -->
<!-- ============================================================ -->

**Kya hota hai:**

- API ek unique Ticket ID generate karta hai (UUID format)
- Photo ko Amazon S3 bucket mein save karta hai: `tickets/1b90c009.jpg`
- S3 se ek permanent URL milta hai — photo kabhi delete nahi hogi
- CloudWatch mein log hota hai: `S3_UPLOAD_SUCCESS`
- **Cost: ₹0** (free tier mein cover hai)

> 💡 **S3 kyun?** Ye AWS ka sabse reliable aur sasta storage hai. Free tier mein 5GB free milta hai. Photo permanently stored rahegi aur kisi bhi time access ki ja sakti hai.

---

### Step 3: AI Brain Kaam Karta Hai (SABSE IMPORTANT!)

Yeh project ka **core innovation** hai — ek **3-Layer Graceful Degradation Pipeline** jo guarantee karta hai ki ticket HAMESHA categorize hogi, chahe kuch bhi ho jaye.

<!-- ============================================================ -->
<!-- 📷 IMAGE 4: Upload karo — Step 3 AI Brain diagram            -->
<!-- (Photo+Text → LAYER 1 Bedrock [orange] → LAYER 2            -->
<!-- Rekognition [orange] → LAYER 3 Fallback [green] → Result    -->
<!-- [blue: category: Sanitation, urgency: HIGH, DISPATCHED])     -->
<!-- ============================================================ -->

**Kya hota hai (3 Layers):**

**🧠 Layer 1 — Amazon Bedrock (Nova Lite):**

Ye sabse intelligent layer hai. Photo + text dono ek saath dekhta hai. Samajhta hai: *"Oh, ye kachre ka photo hai aur text mein badbu likh raha hai."* Output: `{category: Sanitation, urgency: High}`. PAR: Free tier ka daily quota khatam ho gaya toh `ThrottlingException` aata hai. TAB: Automatically niche wali layer try hoti hai ⬇️

**👁️ Layer 2 — Amazon Rekognition (ABHI ACTIVE ✅):**

Ye photo mein cheezein pehchanta hai. Bolega: *"Mujhe dikh raha hai: Garbage (95%), Plastic Bag (88%), Road (72%)"* Humara code in words ko match karta hai:
- `Garbage` detected? → Category = **Sanitation**
- `Road` detected? → Category = **Roads/Infrastructure**
- Text mein "danger" likha? → Urgency = **HIGH**

**YE LAYER ABHI LIVE KAAM KAR RAHI HAI!**

**💡 Layer 3 — Smart Fallback (Always Active Backup):**

Agar dono AWS AI fail ho jayein → ye text se keywords match karta hai:
- `kachra / kuda / safai` → Garbage
- `gaddha / sadak` → Pothole
- `bijli / light` → Electricity

Ye **KABHI fail nahi hota** = App 100% reliable. Yahi hai production-grade **graceful degradation**.

---

### Step 4: Ticket DynamoDB Mein Save Hota Hai

AI analysis complete hone ke baad, poori information ek structured ticket ke roop mein DynamoDB table `CivicTickets` mein save hoti hai.

<!-- ============================================================ -->
<!-- 📷 IMAGE 5: Upload karo — Step 4 DynamoDB diagram            -->
<!-- (API → PutItem → DynamoDB CivicTickets + CloudWatch          -->
<!-- TICKET_CREATED; Saved Ticket: ticketId, category,            -->
<!-- urgency: HIGH, dept: Waste Mgmt, aiSource: rekognition)      -->
<!-- ============================================================ -->

**Kya hota hai:**

- AI ne result de diya → ab saari info ek structured ticket ban kar DynamoDB mein save hoti hai
- Ticket mein ye save hota hai:
  - 📷 Photo ka S3 URL
  - 📂 Category (Sanitation, Roads, etc.)
  - 🔴 Urgency (High / Medium / Low)
  - 🏢 Department (Waste Mgmt, Public Works, etc.)
  - 🤖 AI Source (rekognition / bedrock / fallback)
- CloudWatch mein `TICKET_CREATED` log hota hai

> 💡 **DynamoDB kyun?** Serverless NoSQL database hai — koi server manage nahi karna padta, automatically scale hota hai, aur free tier mein 25GB tak free hai.

---

### Step 5: Dashboard Par Results Dikhte Hain

Ticket save hone ke baad, user automatically Dashboard page (`/dashboard`) par redirect ho jata hai.

<!-- ============================================================ -->
<!-- 📷 IMAGE 6: Yahan manually add karna — Step 5 Dashboard      -->
<!-- diagram (Citizen → /api/get-tickets → Dashboard →            -->
<!-- RED HIGH / YELLOW MEDIUM / GREEN LOW urgency cards)          -->
<!-- ============================================================ -->

**Kya hota hai:**

- Ticket save hone ke baad citizen Dashboard par redirect hota hai
- Dashboard DynamoDB se saare tickets fetch karta hai
- Har ticket ek card mein dikhta hai:
  - 🔴 **Red border** = HIGH urgency (abhi kuch karo!)
  - 🟡 **Yellow border** = MEDIUM (jaldi dhyan do)
  - 🟢 **Green border** = LOW (schedule kar lo)
- Har card mein `category`, `summary`, `department`, aur `AI source` dikhta hai

---

### 🔄 Pura Flow Ek Line Mein

<!-- ============================================================ -->
<!-- 📷 IMAGE 7: Yahan manually add karna — One-liner flow        -->
<!-- (Photo+Text → S3 Save → AI Analyze → DynamoDB Store →        -->
<!-- Dashboard Display; Log → CloudWatch)                         -->
<!-- ============================================================ -->

**Citizen photo deta hai → S3 mein save hoti hai → AI analyze karta hai → DynamoDB mein ticket banta hai → Dashboard par dikhta hai**

Bas, itna hi hai! Simple, fast, aur 6 AWS Services use ho rahi hain! 🚀

---

## 💡 The Core Innovation: A 3-Layer AI Fallback Pipeline

In critical municipal systems, system downtime or API limits should never stop a citizen complaint from reaching authorities. To guarantee 100% reliability, I designed a 3-layer AI engine:

```
Layer 1: Amazon Bedrock (Nova Lite)
         ↓ [On Daily Token Limit / ThrottlingException]
Layer 2: Amazon Rekognition (Computer Vision Labels) + Smart Mapper
         ↓ [On Network Error]
Layer 3: Heuristic Keyword NLP (Hindi & English Emergency Rules)
```

**Layer 1:** Amazon Bedrock (Nova Lite) handles multimodal reasoning combining text and image.

**Layer 2:** If Bedrock reaches daily token quotas, Amazon Rekognition takes over by extracting visual labels from the image and mapping them to the right municipal department.

**Layer 3:** If external vision APIs are unreachable, an intelligent rule-based keyword engine parses Hindi and English text to ensure the complaint is still routed.

### How Layer 2 Computer Vision Works in Code:

When Bedrock reached free-tier limits, Amazon Rekognition immediately stepped in without missing a beat:

```typescript
// Detect visual labels using Amazon Rekognition
const rekClient = new RekognitionClient(getAwsConfig());
const response = await rekClient.send(new DetectLabelsCommand({
  Image: { Bytes: imageBuffer },
  MaxLabels: 15,
  MinConfidence: 60,
}));

const labels = (response.Labels || []).map(l => l.Name?.toLowerCase() || "");

// Automatic Municipal Routing Map
const categoryMap = [
  { 
    match: ["pothole", "road", "asphalt", "puddle", "crack", "gaddha"], 
    category: "Roads / Infrastructure", 
    department: "Public Works Department", 
    baseUrgency: "Medium" 
  },
  { 
    match: ["garbage", "trash", "waste", "dump", "kachra", "dustbin"], 
    category: "Sanitation / Garbage", 
    department: "Waste Management Authority", 
    baseUrgency: "High" 
  },
  { 
    match: ["electric", "wire", "cable", "pole", "light", "bijli"], 
    category: "Electricity / Streetlights", 
    department: "Electrical Maintenance Division", 
    baseUrgency: "High" 
  }
];
```

If the citizen writes *"too dangerous"* or *"accident risk"*, the urgency algorithm elevates the badge to **🔴 High URGENCY**, immediately prioritizing the ticket on the municipal supervisor's dashboard.

---

## 🚀 Real-World Live Testing

During live testing on our deployed AWS Amplify domain, I submitted a photo of a waterlogged pothole with the description: *"Road pothole which is too dangerous"*. Within 3 seconds, the system completed the entire pipeline:

- ✅ The photo was saved to Amazon S3.
- ✅ Amazon Rekognition detected water and road elements.
- ✅ The complaint was classified under **"Roads / Infrastructure"** and routed directly to the **"Public Works Department"**.
- ✅ Because the description mentioned danger, the ticket was automatically marked with a **"🔴 High Urgency"** alert.
- ✅ The ticket was saved in Amazon DynamoDB and rendered live on the Municipal Dispatch Dashboard.

**Total time: under 3.2 seconds ⚡**

---

## 📈 What's Next for CivicSense AI

Moving forward, we plan to expand the platform with several production features:

**Haversine Distance Calculation:** Automatically capturing GPS coordinates and sorting tickets on field workers' tablets by driving distance to save fuel and time.

**Before and After Verification:** Requiring municipal workers to upload a photograph of the resolved issue before closing the ticket.

**Automated Archival:** Using DynamoDB Time-To-Live (TTL) to expire two-month-old resolved tickets and move them to cold storage in Amazon S3 for public records and audits.

**Public Transparency Feed:** Allowing citizens to view, confirm, and upvote resolved neighborhood repairs.

---

## 🏁 Conclusion

Building CivicSense AI as a solo builder during this hackathon showed the true power of the AWS ecosystem. Combining **AWS Amplify** for hosting, **Amazon Rekognition and Bedrock** for intelligence, and **DynamoDB** for storage allowed me to turn an idea into a live, deployed civic technology product in less than **16 hours**.

- 🌐 **Live Application:** https://main.d86p74dnuf9m2.amplifyapp.com
- 🐙 **GitHub Repository:** https://github.com/piyusdev2006/civicsense-ai

---

*Built with ❤️ for Indian Cities during the WeMakeDevs × AWS First Commit Hackathon 2026.*
