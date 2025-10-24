import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, phone, date, services, startTime } = body
        // optional client name from request
        const clientNameFromBody = (body.name || body.clientName || "").trim()

        // Validate required fields
        if (!userId || !phone || !date || !services || !Array.isArray(services) || services.length === 0) {
            return NextResponse.json({ error: "Missing required fields: userId, phone, date, services" }, { status: 400 })
        }

        // Calculate totals
        const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
        const totalPrice = services.reduce((sum, service) => sum + service.price, 0)

        // Calculate end time
        const [startHour, startMinute] = startTime.split(":").map(Number)
        const endMinutes = startHour * 60 + startMinute + totalDuration
        const endHour = Math.floor(endMinutes / 60)
        const endMinute = endMinutes % 60
        const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`

        // Check if client exists
        const clientsSnapshot = await adminDb
            .collection("clients")
            .where("phone", "==", phone)
            .where("userId", "==", userId)
            .limit(1)
            .get()

        let clientId: string
        let clientData: any = null

        if (clientsSnapshot.empty) {
            // Create new client (use provided name if available)
            const newClientRef = await adminDb.collection("clients").add({
                phone,
                userId,
                name: clientNameFromBody || "",
                notes: "",
            })
            clientId = newClientRef.id
            clientData = { name: clientNameFromBody || "", phone, userId }
        } else {
            clientId = clientsSnapshot.docs[0].id
            clientData = clientsSnapshot.docs[0].data()
            // If we have a name from the request and the stored client has no name, update it
            if (clientNameFromBody && !clientData.name) {
                await adminDb.collection("clients").doc(clientId).update({ name: clientNameFromBody })
                clientData.name = clientNameFromBody
            }
        }

        // Create appointment
        const appointmentData = {
            client: {
                clientId,
                phone,
                name: clientData?.name || clientNameFromBody || "",
            },
            createdAt: FieldValue.serverTimestamp(),
            date,
            services: services.map((service) => ({
                id: service.id,
                name: service.name,
                duration: service.duration,
                price: service.price,
            })),
            startTime,
            endTime,
            totalDuration,
            totalPrice,
            userId,
            status: "pending"
        }

        const appointmentRef = await adminDb.collection("appointments").add(appointmentData)

        // Enviar notificação push para o app Expo, se o usuário tiver token
        try {
            console.log("Sending push notification to client:", clientId)
            const userSnap = await adminDb.collection("users").doc(clientId).get()
            if (userSnap.exists) {
                const user = userSnap.data()
                if (user?.expoPushToken && user?.notificationsEnabled) {
                    await fetch("https://exp.host/--/api/v2/push/send", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            to: user.expoPushToken,
                            title: "Novo agendamento",
                            body: `Uma nova solicitação de agendamento foi criada para ${date} às ${startTime}`,
                            sound: "default"
                        })
                    })
                    console.log("Push notification sent to:", user.name)
                } else {
                    console.log("User does not have push token or notifications disabled:", clientId)
                }
            }
        } catch (err) {
            console.error("Erro ao enviar push notification:", err)
        }

        return NextResponse.json({
            success: true,
            appointmentId: appointmentRef.id,
            message: "Agendamento criado com sucesso!",
        })
    } catch (error) {
        console.error("Error creating appointment:", error)
        return NextResponse.json({ error: "Erro ao criar agendamento. Tente novamente." }, { status: 500 })
    }
}
