import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("Evolution webhook received:", JSON.stringify(body, null, 2))

    // Handle different webhook events
    const { event, instance, data } = body

    switch (event) {
      case "connection.update":
        console.log(`Instance ${instance} connection update:`, data.state)
        
        // You can store connection status in your database here
        // Example: Update user's WhatsApp connection status
        if (data.state === "open") {
          console.log(`Instance ${instance} is now connected`)
          // Update database with connected status
        } else if (data.state === "close") {
          console.log(`Instance ${instance} is now disconnected`)
          // Update database with disconnected status
        }
        break

      case "qrcode.updated":
        console.log(`New QR code for instance ${instance}`)
        // Store QR code in cache or database for frontend polling
        break

      case "messages.upsert":
        console.log(`New message in instance ${instance}:`, data)
        // Handle incoming messages here
        break

      case "send.message":
        console.log(`Message sent from instance ${instance}:`, data)
        // Handle message delivery confirmation
        break

      default:
        console.log(`Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ success: true, message: "Webhook processed" })
  } catch (error) {
    console.error("Error processing Evolution webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}