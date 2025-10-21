import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_URL = "https://api.qroagenda.com"
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function POST(request: NextRequest, { params }: { params: Promise<{ instanceName: string }> }) {
  try {
    const { instanceName } = await params
    const body = await request.json()
    const { number, message } = body

    if (!instanceName) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 })
    }

    if (!number || !message) {
      return NextResponse.json({ error: "Missing required fields: number, message" }, { status: 400 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Evolution API key not configured" }, { status: 500 })
    }

    // Send message via Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number,
        text: message
      }),
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error("Evolution API error:", errorData)
      return NextResponse.json(
        { error: "Failed to send message via Evolution API", details: errorData },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData = await evolutionResponse.json()

    return NextResponse.json({
      success: true,
      messageId: evolutionData.key?.id || evolutionData.messageId,
      message: "Mensagem enviada com sucesso!"
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}