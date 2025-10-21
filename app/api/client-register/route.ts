import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, phone, password, name, birthDate } = await request.json()
    if (!userId || !email || !phone || !password || !name || !birthDate) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 })
    }

    // Verifica se já existe cliente com mesmo email ou telefone para o mesmo salão
    const existing = await adminDb.collection("clients")
      .where("userId", "==", userId)
      .where("email", "==", email)
      .get()
    if (!existing.empty) {
      return NextResponse.json({ error: "Já existe um cliente com este e-mail." }, { status: 409 })
    }
    const existingPhone = await adminDb.collection("clients")
      .where("userId", "==", userId)
      .where("phone", "==", phone)
      .get()
    if (!existingPhone.empty) {
      return NextResponse.json({ error: "Já existe um cliente com este telefone." }, { status: 409 })
    }

    // Cria novo cliente
    const clientRef = await adminDb.collection("clients").add({
      userId,
      email,
      phone,
      password,
      name,
      birthDate: new Date(birthDate),
      createdAt: FieldValue.serverTimestamp(),
    })
  const clientDoc = await clientRef.get()
  const client = clientDoc.data() || {}
  if (client.password) delete client.password
  return NextResponse.json({ client })
  } catch (error) {
    console.error("Erro ao cadastrar cliente:", error)
    return NextResponse.json({ error: "Erro interno ao cadastrar." }, { status: 500 })
  }
}
