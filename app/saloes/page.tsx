"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Professional {
  id: string
  name?: string
  email?: string
  profession?: string
}

export default function SaloesPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const res = await fetch('/api/professionals')
        const data = await res.json()
        setProfessionals(data.professionals || [])
      } catch (err) {
        console.error('Error fetching professionals', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfessionals()
  }, [])

  // group by profession
  const grouped = professionals.reduce<Record<string, Professional[]>>((acc, prof) => {
    const key = prof.profession || 'Outros'
    if (!acc[key]) acc[key] = []
    acc[key].push(prof)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white text-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-purple-700">Salões e Profissionais</h1>
          <div className="space-x-2">
            <Link href="/">
              <Button className="bg-purple-600 text-white">Home</Button>
            </Link>
          </div>
        </header>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          Object.keys(grouped).map((profession) => (
            <section key={profession} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">{profession}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {grouped[profession].map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 shadow-sm">
                    <h3 className="font-semibold text-lg">{p.name || '—'}</h3>
                    <p className="text-sm text-gray-500">{p.email || ''}</p>
                    <div className="mt-4 flex gap-2">
                      <Link href={`/agendar/${p.id}`} className="inline-block">
                        <Button className="bg-purple-600 text-white">Agendar</Button>
                      </Link>
                      <Link href={`/users/${p.id}`} className="inline-block">
                        <Button variant="outline">Ver perfil</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
