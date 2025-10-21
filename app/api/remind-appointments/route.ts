import { adminDb } from "@/lib/firebase-admin"
import { evolutionAPI } from "@/lib/evolution-api"
import { Timestamp } from "firebase-admin/firestore"

// Função para rodar a cada 5 minutos (ex: via cron ou endpoint manual)
export async function remindAppointments() {
    // Buscar todos os agendamentos futuros (status 'scheduled')
    const now = new Date()
    const appointmentsSnap = await adminDb
        .collection("appointments")
        .where("status", "==", "scheduled")
        .where("date", ">=", now.toISOString().split("T")[0])
        .get()

    if (appointmentsSnap.empty) return { sent: 0 }

    let sent = 0
    const remindersToSend: Array<{
        appointment: any,
        settings: any,
        client: any
    }> = []

    // Agrupar por userId para buscar settings em lote
    const userIds = new Set<string>()
    appointmentsSnap.docs.forEach(doc => {
        const data = doc.data()
        userIds.add(data.userId)
    })

    // Buscar settings de todos os userIds
    const settingsMap: Record<string, any> = {}
    const settingsSnaps = await Promise.all(
        Array.from(userIds).map(userId =>
            adminDb.collection("settings").doc(userId).get()
        )
    )
    settingsSnaps.forEach(snap => {
        if (snap.exists) settingsMap[snap.id] = snap.data()
    })

    // Para cada agendamento, verificar se precisa disparar lembrete
    for (const doc of appointmentsSnap.docs) {
        const appointment = doc.data()
        const settings = settingsMap[appointment.userId]
        if (!settings?.reminderSettings?.hoursBeforeReminder || !settings?.reminderSettings?.reminderMessage) continue

        // Respeitar o campo salonUF do settings
        // Se quiser filtrar por UF, adicione aqui:
        // Exemplo: só dispara se salonUF === "MS"
        if (settings.salonUF && settings.salonUF !== "MS") continue

        // Buscar dados do cliente
        const clientSnap = await adminDb.collection("clients").doc(appointment.client?.clientId).get()
        if (!clientSnap.exists) continue
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
        const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}:00${offsetStr}`)
        const hoursBefore = settings.reminderSettings.hoursBeforeReminder
        const reminderTime = new Date(appointmentDate.getTime() - hoursBefore * 60 * 60 * 1000)

        // Se agora está entre reminderTime e reminderTime+5min, disparar
        if (now >= reminderTime && now < new Date(reminderTime.getTime() + 5 * 60 * 1000)) {
            remindersToSend.push({ appointment, settings, client })
        }
    }

    // Disparar lembretes
    for (const { appointment, settings, client } of remindersToSend) {
        const msg = settings.reminderSettings.reminderMessage.replace("{horario}", appointment.startTime)
        // Enviar WhatsApp
        await evolutionAPI.sendMessage(settings.userId, {
            number: client.phone,
            text: msg
        })
        sent++
    }

    return { sent }
}

// Exemplo de endpoint manual para disparar (pode ser removido em produção)
import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest) {
    const result = await remindAppointments()
    return NextResponse.json(result)
}
