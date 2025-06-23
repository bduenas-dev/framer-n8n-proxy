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

  try {
    const response = await fetch("https://quantr.app.n8n.cloud/webhook/texttone-gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    })

    const contentType = response.headers.get("content-type")
    const rawText = await response.text()

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Expected JSON but got: " + rawText.slice(0, 100))
    }

    const data = JSON.parse(rawText)

    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(200).json(data)
  } catch (error) {
    console.error("Proxy error:", error.message)
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(500).json({ error: "Proxy failed", details: error.message })
  }
}

