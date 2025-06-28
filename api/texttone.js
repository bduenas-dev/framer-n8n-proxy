export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { userInput } = req.body
  if (!userInput || typeof userInput !== "string") {
    return res.status(400).json({ message: "Missing or invalid input" })
  }

  try {
    // Step 1: Call Render-hosted model
    const modelRes = await fetch("https://sentiate-api.onrender.com/texttone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userInput }),
    })

    const modelData = await modelRes.json()

    // Step 2: GPT Rewrite + Summary (structured JSON)
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that analyzes tone and rewrites messages. Respond ONLY with a JSON object matching this format:

{
  "summary": "Friendly sentence commenting on the tone of the original message.",
  "rewrites": {
    "Professional": "Rewrite in a professional tone.",
    "Casual": "Rewrite in a casual tone.",
    "Confident": "Rewrite in a confident tone."
  }
}

No commentary, no markdown — just return the JSON object.`,
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        temperature: 0.7,
      }),
    })

    const gptData = await gptRes.json()
    const gptText = gptData.choices?.[0]?.message?.content ?? "{}"

    let summary = ""
    let rewrites = {}

    try {
      const parsed = JSON.parse(gptText)
      summary = parsed.summary ?? ""
      rewrites = parsed.rewrites ?? {}
    } catch (err) {
      console.warn("Failed to parse GPT response:", gptText)
      summary = ""
      rewrites = {}
    }

    // Step 3: Final response to Framer
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json({
      success: true,
      original: userInput,
      tone: {
        label: modelData.tone_label,
        score: modelData.tone_score,
        confidence: modelData.confidence,
        percent: modelData.confidence_percent,
        meter: modelData.display_meter,
      },
      summary,
      rewrites,
    })
  } catch (err) {
    console.error("Proxy failed:", err)
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(500).json({
      error: "Backend failure",
      details: err.message,
    })
  }
}
