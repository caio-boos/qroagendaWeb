import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    console.log("Received userId:", userId)

    // Get settings by userId field (not document ID)
    const settingsSnapshot = await adminDb.collection("settings").where("userId", "==", userId).limit(1).get()
    console.log("Settings found:", !settingsSnapshot.empty)

    if (settingsSnapshot.empty) {
      return NextResponse.json({ 
        error: "Configurações não encontradas para este profissional",
        debug: { userId }
      }, { status: 404 })
    }

    const settings = settingsSnapshot.docs[0].data()
    console.log("Settings data:", settings)

    if (!settings?.publicSchedulingEnabled) {
      return NextResponse.json({ error: "Agendamento público não está habilitado" }, { status: 403 })
    }

    // Get services by userId field (not subcollection)
    const servicesSnapshot = await adminDb.collection("services").where("userId", "==", userId).get()
    console.log("Services found:", servicesSnapshot.docs.length)

    const services = servicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("Returning data:", { settings, services })

    return NextResponse.json({
      settings,
      services,
    })
  } catch (error) {
    console.error("Error fetching scheduling data:", error)
    return NextResponse.json({ error: "Erro ao buscar dados de agendamento" }, { status: 500 })
  }
}
