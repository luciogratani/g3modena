import http from "node:http"

const PORT = Number(process.env.PORT ?? "8788")

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    request.on("error", reject)
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"))
    })
  })
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "POST") {
    response.writeHead(405, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ error: "method_not_allowed" }))
    return
  }

  if (request.url !== "/ingest") {
    response.writeHead(404, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ error: "not_found" }))
    return
  }

  try {
    const rawBody = await readBody(request)
    const payload = rawBody ? JSON.parse(rawBody) : { events: [] }
    const events = Array.isArray(payload?.events) ? payload.events : []
    const acceptedEventIds = events
      .map((event) => (typeof event?.client_event_id === "string" ? event.client_event_id.trim() : ""))
      .filter(Boolean)

    console.info("[mock-analytics-ingest] received", {
      count: events.length,
      sample: events[0] ?? null,
    })

    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(
      JSON.stringify({
        accepted_event_ids: acceptedEventIds,
        accepted_count: events.length,
      })
    )
  } catch (error) {
    console.error("[mock-analytics-ingest] invalid_payload", error)
    response.writeHead(400, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ error: "invalid_payload" }))
  }
})

server.listen(PORT, () => {
  console.info(`[mock-analytics-ingest] listening on http://localhost:${PORT}/ingest`)
})
