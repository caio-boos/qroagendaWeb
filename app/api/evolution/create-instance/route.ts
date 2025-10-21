import { type NextRequest, NextResponse } from "next/server"

const EVOLUTION_API_URL = "https://api.qroagenda.com"
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceName, userId } = body

    if (!instanceName || !userId) {
      return NextResponse.json({ error: "Missing required fields: instanceName, userId" }, { status: 400 })
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: "Evolution API key not configured" }, { status: 500 })
    }

    // Create instance in Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: EVOLUTION_API_KEY,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/evolution/webhook`,
        webhookByEvents: false,
        webhookBase64: false,
        chatwootSignMsg: false,
        chatwootReopenConversation: false,
        chatwootConversationPending: false
        // Removendo campos chatwoot nulos que causam erro de validação
      }),
    })

    if (!evolutionResponse.ok) {
      let errorData
      let errorMessage = "Falha ao criar instância na Evolution API"
      
      try {
        errorData = await evolutionResponse.json()
        console.error("🚨 Evolution API Error Details:", {
          status: evolutionResponse.status,
          statusText: evolutionResponse.statusText,
          url: `${EVOLUTION_API_URL}/instance/create`,
          instanceName: instanceName,
          errorResponse: errorData
        })

        // Parse error messages for better user feedback
        if (errorData.response?.message && Array.isArray(errorData.response.message)) {
          const messages = errorData.response.message.flat()
          errorMessage = `Erro de validação: ${messages.join(', ')}`
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (parseError) {
        // If JSON parsing fails, get text
        errorData = await evolutionResponse.text()
        console.error("🚨 Evolution API Raw Error:", {
          status: evolutionResponse.status,
          statusText: evolutionResponse.statusText,
          rawResponse: errorData
        })
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorData,
          status: evolutionResponse.status 
        },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData = await evolutionResponse.json()

    console.log("✅ Evolution Instance Created Successfully:", {
      instanceName: instanceName,
      userId: userId,
      status: evolutionData.status || 'created',
      response: evolutionData
    })

    return NextResponse.json({
      success: true,
      instance: evolutionData,
      message: "Instância criada com sucesso!"
    })
  } catch (error) {
    console.error("Error creating Evolution instance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}