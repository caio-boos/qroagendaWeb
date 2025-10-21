import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_URL = "https://api.qroagenda.com"
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function GET(request: NextRequest, { params }: { params: Promise<{ instanceName: string }> }) {
  try {
    const { instanceName } = await params

    if (!instanceName) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Evolution API key not configured" }, { status: 500 })
    }

    // Get QR code from Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error("Evolution API error:", errorData)
      return NextResponse.json(
        { error: "Failed to get QR code from Evolution API", details: errorData },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData = await evolutionResponse.json()

    // console.log(evolutionData.base64.slice(0, 30) + '...')

    return NextResponse.json({
      success: true,
      qrcode: evolutionData.base64 || evolutionData.qrcode,
      status: evolutionData.status || "disconnected"
    })
  } catch (error) {
    console.error("Error getting QR code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}