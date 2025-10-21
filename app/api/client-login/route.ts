import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, phone, password } = await request.json()
    if (!userId || (!email && !phone) || !password) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 })
    }

    let query = adminDb.collection("clients").where("userId", "==", userId)
    if (email) {
      query = query.where("email", "==", email)
    } else {
      query = query.where("phone", "==", phone)
    }
    const snapshot = await query.limit(1).get()
    if (snapshot.empty) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
    }
    const client = snapshot.docs[0].data()
    if (client.password !== password) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 })
    }
    // Não retornar senha para o frontend
    delete client.password
    return NextResponse.json({ client })
  } catch (error) {
    console.error("Erro no login do cliente:", error)
    return NextResponse.json({ error: "Erro interno ao fazer login." }, { status: 500 })
  }
}
