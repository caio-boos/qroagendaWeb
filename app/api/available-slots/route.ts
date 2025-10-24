import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, date, totalDuration } = body

        console.log("Received request:", { userId, date, totalDuration })

        if (!userId || !date || !totalDuration) {
            return NextResponse.json({ error: "Missing required fields: userId, date, totalDuration" }, { status: 400 })
        }

        // Get settings by userId field (not document ID)
        const settingsSnapshot = await adminDb.collection("settings").where("userId", "==", userId).limit(1).get()

        if (settingsSnapshot.empty) {
            return NextResponse.json({ error: "Settings not found" }, { status: 404 })
        }

        const settings = settingsSnapshot.docs[0].data()
        console.log("Settings found:", settings)

        // Ensure consistent date format
        const dateStr = date // Should be in YYYY-MM-DD format

        // If public scheduling is disabled for this salon, return no slots
        if (settings?.publicSchedulingEnabled === false) {
            console.log("Public scheduling disabled for user:", userId)
            return NextResponse.json({ slots: [] })
        }

        // Respect schedulingOpenUntil: if present and date requested is after the limit, return no slots
        // schedulingOpenUntil may be a string YYYY-MM-DD, a Firestore Timestamp-like object, or null/undefined
        let schedulingOpenUntilStr: string | null = null
        const schedulingOpenUntil = settings?.schedulingOpenUntil
        if (schedulingOpenUntil) {
            if (typeof schedulingOpenUntil === 'string') {
                schedulingOpenUntilStr = schedulingOpenUntil
            } else if (typeof schedulingOpenUntil === 'object') {
                // Firestore Timestamp object: has toDate() or seconds
                if (typeof schedulingOpenUntil.toDate === 'function') {
                    schedulingOpenUntilStr = schedulingOpenUntil.toDate().toISOString().split('T')[0]
                } else if (typeof schedulingOpenUntil.seconds === 'number') {
                    schedulingOpenUntilStr = new Date(schedulingOpenUntil.seconds * 1000).toISOString().split('T')[0]
                }
            }
        }

        if (schedulingOpenUntilStr) {
            if (dateStr > schedulingOpenUntilStr) {
                console.log("Requested date is beyond schedulingOpenUntil:", dateStr, schedulingOpenUntilStr)
                return NextResponse.json({ slots: [] })
            }
        }

        // Check if date is closed
        if (Array.isArray(settings?.closedDates) && settings.closedDates.includes(dateStr)) {
            console.log("Date is closed:", dateStr)
            return NextResponse.json({ slots: [] })
        }

        // Get appointments for the date - convert date to proper format for comparison
        console.log("Searching appointments for date:", date)
        
        const appointmentsSnapshot = await adminDb
            .collection("appointments")
            .where("userId", "==", userId)
            .get() // Get all appointments and filter in code due to date format differences

        console.log("All appointments for user:", appointmentsSnapshot.docs.length)

        // Filter appointments by date
        const appointments = appointmentsSnapshot.docs
            .map((doc) => {
                const data = doc.data()
                console.log("Appointment data:", data)
                return data
            })
            .filter((apt) => {
                // Handle both string dates (YYYY-MM-DD) and Firestore timestamps
                let appointmentDateStr: string
                
                if (apt.date && typeof apt.date === 'string') {
                    appointmentDateStr = apt.date
                } else if (apt.date && apt.date.toDate) {
                    // Firestore timestamp - convert to YYYY-MM-DD
                    const dateObj = apt.date.toDate()
                    appointmentDateStr = dateObj.toISOString().split('T')[0]
                } else if (apt.date && apt.date.seconds) {
                    // Firestore timestamp format
                    const dateObj = new Date(apt.date.seconds * 1000)
                    appointmentDateStr = dateObj.toISOString().split('T')[0]
                } else {
                    console.log("Invalid appointment date format:", apt.date)
                    return false
                }
                
                const matches = appointmentDateStr === date
                console.log(`Appointment date: ${appointmentDateStr}, Request date: ${date}, Matches: ${matches}`)
                return matches
            })

        console.log("Filtered appointments for date:", appointments.length, appointments)

        // Calculate available slots
        const slots = calculateAvailableSlots(settings.workingHours, settings.lunchBreak, appointments, totalDuration)
        console.log("Generated slots:", slots)

        return NextResponse.json({ slots })
    } catch (error) {
        console.error("Error calculating available slots:", error)
        return NextResponse.json({ error: "Error calculating available slots" }, { status: 500 })
    }
}

function calculateAvailableSlots(
    workingHours: { start: string; end: string },
    lunchBreak: { start: string; end: string } | null | undefined,
    appointments: any[],
    totalDuration: number,
): string[] {
    console.log("Calculating slots with:", { workingHours, lunchBreak, appointments, totalDuration })
    
    const slots: string[] = []

    // Convert time strings to minutes
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number)
        return hours * 60 + minutes
    }

    const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
    }

    if (!workingHours || !workingHours.start || !workingHours.end) {
        console.log("Invalid working hours:", workingHours)
        return []
    }

    const workStart = timeToMinutes(workingHours.start)
    const workEnd = timeToMinutes(workingHours.end)
    
    console.log("Work hours in minutes:", { workStart, workEnd })

    // Handle optional lunch break
    let lunchStart: number | null = null
    let lunchEnd: number | null = null

    if (lunchBreak && lunchBreak.start && lunchBreak.end) {
        lunchStart = timeToMinutes(lunchBreak.start)
        lunchEnd = timeToMinutes(lunchBreak.end)
        console.log("Lunch break in minutes:", { lunchStart, lunchEnd })
    } else {
        console.log("No lunch break defined")
    }

    // Create occupied time ranges
    const occupiedRanges: Array<{start: number, end: number}> = []
    
    // Add existing appointments
    appointments.forEach((apt) => {
        if (apt.startTime && apt.endTime) {
            const start = timeToMinutes(apt.startTime)
            const end = timeToMinutes(apt.endTime)
            occupiedRanges.push({ start, end })
            console.log(`Blocked appointment: ${apt.startTime}-${apt.endTime} (${start}-${end} minutes)`)
        }
    })

    // Add lunch break as occupied (only if it exists)
    if (lunchStart !== null && lunchEnd !== null) {
        occupiedRanges.push({ start: lunchStart, end: lunchEnd })
        console.log(`Blocked lunch break: ${minutesToTime(lunchStart)}-${minutesToTime(lunchEnd)}`)
    }

    // Sort occupied ranges
    occupiedRanges.sort((a, b) => a.start - b.start)
    console.log("Occupied ranges:", occupiedRanges)

    // Generate slots every 15 minutes
    const slotInterval = 15

    // Allow slots that start at or before the closing time even if the service would end after closing.
    // This enables allowing e.g. a 3h service starting at 16:00 when closing is 18:00 (ends at 19:00),
    // provided the slot does not overlap any existing appointment/lunch break.
    for (let time = workStart; time <= workEnd; time += slotInterval) {
        const slotEnd = time + totalDuration

        // Check if slot overlaps with any occupied range
        // A slot is NOT available if it overlaps with any occupied range
        const hasConflict = occupiedRanges.some((range) => {
            // Check if the slot (time to slotEnd) overlaps with the occupied range
            const overlaps = !(slotEnd <= range.start || time >= range.end)
            
            if (overlaps) {
                console.log(`Slot ${minutesToTime(time)}-${minutesToTime(slotEnd)} conflicts with occupied range ${minutesToTime(range.start)}-${minutesToTime(range.end)}`)
            }
            
            return overlaps
        })

        if (!hasConflict) {
            const slotTime = minutesToTime(time)
            console.log(`Available slot: ${slotTime} (${slotTime}-${minutesToTime(slotEnd)})`)
            slots.push(slotTime)
        }
    }

    console.log("Available slots generated:", slots.length, slots)
    return slots
}
