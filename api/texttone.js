export default async function handler(req, res) {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  // ❌ Block all non-POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ CORS headers for POST
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const response = await fetch("https://quantr.app.n8n.cloud/webhook/texttone-gpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    return res.status(200).json(result);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
