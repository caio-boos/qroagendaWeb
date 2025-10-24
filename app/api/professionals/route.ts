import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    const snap = await adminDb.collection('users').get()
    const professionals = snap.docs.map(doc => {
      const d = doc.data() as any
      return {
        id: doc.id,
        name: d.name || null,
        email: d.email || null,
        profession: d.profession || null,
      }
    })
    return NextResponse.json({ professionals })
  } catch (err) {
    console.error('Error fetching professionals', err)
    return NextResponse.json({ professionals: [] })
  }
}
