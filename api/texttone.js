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
    // Step 1: Call your model for tone analysis
    const modelRes = await fetch("https://sentiate-api.onrender.com/texttone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userInput }),
    })

    const modelData = await modelRes.json()

    // Destructure tone info to pass into GPT
    const {
      tone_label,
      confidence_percent,
      display_meter
    } = modelData

    // Step 2: GPT rewrites + tone-aware summary
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
            content: `You are a helpful assistant that rewrites messages and provides tone-aware feedback.

The user's original message was analyzed by a tone detection model. It was classified as:
- Tone: ${tone_label}
- Confidence: ${confidence_percent}%
- Meter: ${display_meter}

Using that as context, respond ONLY with this structured JSON:

{
  "summary": "Friendly sentence commenting on how the original message sounds, using the model's tone as context.",
  "rewrites": {
    "Professional": "...",
    "Casual": "...",
    "Confident": "..."
  }
}

Be kind, natural, and human in the summary. Don’t repeat the same phrasing across all rewrites. No extra commentary. No markdown.`,
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

    // Step 3: Return final payload
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json({
      success: true,
      original: userInput,
      tone: {
        label: tone_label,
        percent: confidence_percent,
        meter: display_meter,
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

