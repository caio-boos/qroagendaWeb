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

    // Get instance status from Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error("Evolution API error:", errorData)
      return NextResponse.json(
        { error: "Failed to get instance status from Evolution API", details: errorData },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData = await evolutionResponse.json()

    return NextResponse.json({
      success: true,
      status: evolutionData.state || evolutionData.status,
      instance: evolutionData.instance || {}
    })
  } catch (error) {
    console.error("Error getting instance status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}