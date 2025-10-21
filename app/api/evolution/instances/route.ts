import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_URL = "https://api.qroagenda.com"
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function GET() {
  try {
    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Evolution API key not configured" }, { status: 500 })
    }

    // Get all instances from Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error("Evolution API error:", errorData)
      return NextResponse.json(
        { error: "Failed to fetch instances from Evolution API", details: errorData },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData = await evolutionResponse.json()

    return NextResponse.json({
      success: true,
      instances: evolutionData
    })
  } catch (error) {
    console.error("Error fetching instances:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceName } = body

    if (!instanceName) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Evolution API key not configured" }, { status: 500 })
    }

    // Delete instance from Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error("Evolution API error:", errorData)
      return NextResponse.json(
        { error: "Failed to delete instance from Evolution API", details: errorData },
        { status: evolutionResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Instância deletada com sucesso!"
    })
  } catch (error) {
    console.error("Error deleting instance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}