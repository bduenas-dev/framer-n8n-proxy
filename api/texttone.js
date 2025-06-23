export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    // 👇 Respond to the CORS preflight check
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

    const data = await response.json()
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.status(200).json(data)
  } catch (err) {
    console.error("❌ Proxy error:", err)
    res.status(500).json({ message: "Proxy failed", error: err.message })
  }
}
