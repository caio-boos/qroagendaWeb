import { adminDb } from "@/lib/firebase-admin"
import { evolutionAPI } from "@/lib/evolution-api"
import { Timestamp, FieldValue } from "firebase-admin/firestore"

// Função para rodar a cada 5 minutos (ex: via cron ou endpoint manual)
export async function remindAppointments() {
    // Buscar todos os agendamentos com status 'scheduled' (filtramos a data em memória
    // para suportar tanto timestamps quanto strings YYYY-MM-DD armazenadas no campo `date`)
    const now = new Date()
    const appointmentsSnap = await adminDb
        .collection("appointments")
        .where("status", "==", "scheduled")
        .get()

    if (appointmentsSnap.empty) return { sent: 0 }

    let sent = 0
    const remindersToSend: Array<{
        appointment: any,
        settings: any,
        client: any,
        docId?: string
    }> = []

    // Agrupar por userId para buscar settings em lote
    const userIds = new Set<string>()
    appointmentsSnap.docs.forEach(doc => {
        const data = doc.data()
        userIds.add(data.userId)
    })

    // Buscar settings de todos os userIds
    // Alguns docs podem ter o doc id igual ao userId, outros armazenam userId como campo.
    const settingsMap: Record<string, any> = {}
    await Promise.all(
        Array.from(userIds).map(async (userId) => {
            // tenta por ID primeiro
            const docSnap = await adminDb.collection("settings").doc(userId).get()
            if (docSnap.exists) {
                settingsMap[userId] = docSnap.data()
                return
            }
            // fallback: busca pelo campo userId
            const q = await adminDb.collection("settings").where("userId", "==", userId).limit(1).get()
            if (!q.empty) {
                settingsMap[userId] = q.docs[0].data()
                return
            }
            console.log(`Remind: no settings doc found for userId=${userId}`)
        })
    )

    console.log("Remind: found userIds:", Array.from(userIds))
    console.log("Remind: settings loaded for:", Object.keys(settingsMap))
    console.log("Remind: EVOLUTION_API_KEY present?", !!process.env.EVOLUTION_API_KEY)
    console.log("Remind: appointments count:", appointmentsSnap.size)

    // Para cada agendamento, verificar se precisa disparar lembrete
    for (const doc of appointmentsSnap.docs) {
        const appointment = doc.data()
        const settings = settingsMap[appointment.userId]
        console.log("Processing appointment:", doc.id)
        console.log({ appointmentSummary: { id: doc.id, userId: appointment.userId, date: appointment.date, startTime: appointment.startTime, client: appointment.client } })

        if (!settings) {
            console.log(`Skipping ${doc.id}: no settings for userId=${appointment.userId}`)
            continue
        }
        if (!settings.reminderSettings) {
            console.log(`Skipping ${doc.id}: settings.reminderSettings missing for userId=${appointment.userId}`)
            continue
        }
        if (!settings.reminderSettings.hoursBeforeReminder) {
            console.log(`Skipping ${doc.id}: hoursBeforeReminder not configured for userId=${appointment.userId}`)
            continue
        }
        if (!settings.reminderSettings.reminderMessage) {
            console.log(`Skipping ${doc.id}: reminderMessage not configured for userId=${appointment.userId}`)
            continue
        }

        // Respeitar o campo salonUF do settings: não filtramos por UF aqui —
        // o envio será feito para todos os salões, mas usaremos o fuso horário (salonUF)
        // para calcular o horário correto.

        // Buscar dados do cliente
        // O clientId pode estar em vários formatos: appointment.client.clientId, appointment.client.id ou appointment.clientId
        const clientId = appointment.client?.clientId || appointment.client?.id || appointment.clientId || appointment.clientId
        if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
            console.log(`Skipping ${doc.id}: no valid clientId found on appointment`)
            continue
        }
        const clientSnap = await adminDb.collection("clients").doc(String(clientId)).get()
        if (!clientSnap.exists) {
            console.log(`Skipping ${doc.id}: client doc not found for clientId=${clientId}`)
            continue
        }
        const client = clientSnap.data()

        // Calcular data/hora do agendamento respeitando o fuso horário do estado
        // Mapeamento simples de UF para offset (pode ser expandido conforme necessário)
        const ufOffsets: Record<string, number> = {
            "AC": -5, "AM": -4, "RO": -4, "RR": -4, "MT": -4, "MS": -4, "DF": -3, "GO": -3, "TO": -3,
            "BA": -3, "MG": -3, "ES": -3, "RJ": -3, "SP": -3, "PR": -3, "SC": -3, "RS": -3,
            "PA": -3, "AP": -3, "MA": -3, "PI": -3, "CE": -3, "RN": -3, "PB": -3, "PE": -3, "AL": -3, "SE": -3
        }
        const salonUF = settings.salonUF || "MS"
        const offset = ufOffsets[salonUF] ?? -3 // padrão -3
        // Monta string de data com offset
        const offsetStr = (offset >= 0 ? "+" : "-") + String(Math.abs(offset)).padStart(2, "0") + ":00"

        // Suporta vários formatos armazenados em `appointment.date`:
        // - Firestore Timestamp (objeto com toDate)
        // - string no formato YYYY-MM-DD
        let appointmentDateStr: string | null = null
        if (appointment.date && typeof appointment.date === 'object' && typeof appointment.date.toDate === 'function') {
            appointmentDateStr = appointment.date.toDate().toISOString().split('T')[0]
        } else if (typeof appointment.date === 'string') {
            appointmentDateStr = appointment.date
        } else if (appointment.date instanceof Date) {
            appointmentDateStr = appointment.date.toISOString().split('T')[0]
        }

        if (!appointmentDateStr || !appointment.startTime) {
            // dados insuficientes para calcular horário
            continue
        }

        const appointmentDate = new Date(`${appointmentDateStr}T${appointment.startTime}:00${offsetStr}`)
        const hoursBefore = Number(settings.reminderSettings.hoursBeforeReminder || 0)
        if (hoursBefore <= 0) continue

        const reminderTime = new Date(appointmentDate.getTime() - hoursBefore * 60 * 60 * 1000)

        // Calculate time until appointment
        const timeUntilAppointmentMs = appointmentDate.getTime() - now.getTime()

        // Determine if this reminder already sent for this hoursBefore (avoid duplicates)
        const alreadySentArray: number[] = Array.isArray(appointment.remindersSent) ? appointment.remindersSent : []
        const alreadySent = alreadySentArray.includes(hoursBefore)

        // Send if:
        // 1) We're inside the original small window (reminderTime .. reminderTime + 5min)
        // OR
        // 2) The appointment is now closer than the configured hoursBefore (e.g. user registered late)
        // and we haven't sent this specific reminder yet.
        const withinWindow = now >= reminderTime && now < new Date(reminderTime.getTime() + 5 * 60 * 1000)
        const missedWindowButSoon = timeUntilAppointmentMs > 0 && timeUntilAppointmentMs <= hoursBefore * 60 * 60 * 1000

        console.log({
            docId: doc.id,
            appointmentDate: appointmentDate.toISOString(),
            now: now.toISOString(),
            hoursBefore,
            reminderTime: reminderTime.toISOString(),
            timeUntilAppointmentMs,
            withinWindow,
            missedWindowButSoon,
            alreadySent
        })

        if ((withinWindow || (missedWindowButSoon && !alreadySent))) {
            remindersToSend.push({ appointment, settings, client, docId: doc.id })
        }
    }

    // Disparar lembretes
    for (const { appointment, settings, client, docId } of remindersToSend) {
        const msg = settings.reminderSettings.reminderMessage.replace("{horario}", appointment.startTime)
        try {
            // Enviar WhatsApp via Evolution API e verificar resposta
            console.log(`Sending reminder for ${docId} to ${client.phone} via instance ${settings.userId}`)
            const sendRes = await evolutionAPI.sendMessage(settings.userId, {
                number: client.phone,
                text: msg
            })

            if (sendRes && (sendRes as any).success) {
                console.log(`Reminder sent for ${docId} — marking remindersSent`)
                // Marca que esse reminder (para este hoursBefore) já foi enviado para evitar reenvios
                if (docId) {
                    await adminDb.collection("appointments").doc(docId).update({
                        remindersSent: FieldValue.arrayUnion(settings.reminderSettings.hoursBeforeReminder)
                    })
                }
                sent++
            } else {
                console.error(`Evolution API returned error for ${docId}:`, sendRes)
            }
        } catch (err) {
            console.error("Error sending reminder for appointment", docId, err)
        }
    }

    return { sent }
}

// Exemplo de endpoint manual para disparar (pode ser removido em produção)
import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest) {
    // Token protection: compare query token with env var or fallback token
    const token = req.nextUrl.searchParams.get("token")
    const expected = "65C27C85A3CC5C69FDD073CBC1004DB1CE8DD75E2B6AE6F776107637DC902805"
    if (!token || token !== expected) {
        console.warn("Unauthorized cron attempt to /api/remind-appointments", { received: token })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await remindAppointments()
    return NextResponse.json(result)
}
