"use client"

import type React from "react"

import { useEffect, useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Loader2 } from "lucide-react"

interface Service {
    id: string
    name: string
    price: number
    duration: number
    color: string
}

interface Settings {
    workingHours: {
        start: string
        end: string
    }
    lunchBreak?: {
        start: string
        end: string
    }
    closedDates?: string[]
    publicSchedulingEnabled?: boolean
    schedulingOpenUntil?: string | { seconds?: number; toDate?: () => Date } | null
}

export default function SchedulingPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params)
    const { toast } = useToast()

    const [selectedServices, setSelectedServices] = useState<Service[]>([])
    const [selectedDate, setSelectedDate] = useState("")
    const [selectedSlot, setSelectedSlot] = useState("")
    const [services, setServices] = useState<Service[]>([])
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [settings, setSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

    // --- AUTENTICAÇÃO CLIENTE ---
    const [authMode, setAuthMode] = useState<"login" | "register">("login")
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState("")
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("qroagenda_client");
            if (stored) setClient(JSON.parse(stored));
        }
    }, []);

    const [authLogin, setAuthLogin] = useState("") // telefone ou email
    const [authEmail, setAuthEmail] = useState("")
    const [authPassword, setAuthPassword] = useState("")
    const [authName, setAuthName] = useState("")
    const [authBirthDate, setAuthBirthDate] = useState("")

    async function hashPassword(password: string) {
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setAuthLoading(true)
        setAuthError("")
        try {
            const hashedPassword = await hashPassword(authPassword)
            const res = await fetch("/api/client-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    email: authLogin.includes("@") ? authLogin : undefined,
                    phone: !authLogin.includes("@") ? authLogin : undefined,
                    password: hashedPassword,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao fazer login")
            setClient(data.client)
            if (typeof window !== "undefined") {
                localStorage.setItem("qroagenda_client", JSON.stringify(data.client))
            }
            toast({ title: "Bem-vindo!", description: `Olá, ${data.client.name}` })
        } catch (err: any) {
            setAuthError(err.message)
        } finally {
            setAuthLoading(false)
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setAuthLoading(true)
        setAuthError("")
        try {
            const hashedPassword = await hashPassword(authPassword)
            const res = await fetch("/api/client-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    phone: authLogin,
                    email: authEmail,
                    password: hashedPassword,
                    name: authName,
                    birthDate: authBirthDate,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Erro ao cadastrar")
            setClient(data.client)
            toast({ title: "Cadastro realizado!", description: `Bem-vindo, ${data.client.name}` })
        } catch (err: any) {
            setAuthError(err.message)
        } finally {
            setAuthLoading(false)
        }
    }

    useEffect(() => {
        if (!userId) return

        const fetchData = async () => {
            try {
                const response = await fetch(`/api/scheduling-data/${userId}`)
                if (!response.ok) {
                    throw new Error("Erro ao carregar dados")
                }
                const data = await response.json()
                setServices(data.services)
                // scheduling-data endpoint should return settings; fallback to data.settings
                setSettings(data.settings ?? data.settings ?? null)
            } catch (error) {
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados de agendamento",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userId, toast])

    // Fetch available slots when date or services change
    useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedDate || selectedServices.length === 0) {
                setAvailableSlots([])
                return
            }

            setLoadingSlots(true)
            try {
                // If public scheduling is disabled, avoid requesting slots
                if (settings && settings.publicSchedulingEnabled === false) {
                    console.log('Public scheduling disabled for this salon; returning no slots')
                    setAvailableSlots([])
                    return
                }
                const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)

                console.log("Frontend: Fetching slots for date:", selectedDate, "totalDuration:", totalDuration)

                const response = await fetch("/api/available-slots", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId,
                        date: selectedDate,
                        totalDuration,
                    }),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error("Frontend: Error response:", errorData)
                    throw new Error("Erro ao buscar horários")
                }

                const data = await response.json()
                console.log("Frontend: Received slots:", data.slots)
                setAvailableSlots(data.slots)
                setSelectedSlot("")
            } catch (error) {
                console.error("Frontend: Error fetching slots:", error)
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os horários disponíveis",
                    variant: "destructive",
                })
            } finally {
                setLoadingSlots(false)
            }
        }

        fetchSlots()
    }, [selectedDate, selectedServices, userId, toast])

    const handleServiceToggle = (service: Service) => {
        setSelectedServices((prev) => {
            const exists = prev.find((s) => s.id === service.id)
            if (exists) {
                return prev.filter((s) => s.id !== service.id)
            } else {
                return [...prev, service]
            }
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!client?.phone || selectedServices.length === 0 || !selectedDate || !selectedSlot) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha todos os campos para continuar",
                variant: "destructive",
            })
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    phone: client.phone,
                    name: client.name || "",
                    date: selectedDate,
                    services: selectedServices,
                    startTime: selectedSlot,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Erro ao criar agendamento")
            }

            toast({
                title: "Sucesso!",
                description: data.message || "Agendamento criado com sucesso!",
            })

            // Reset form for a new booking but keep the selected services so the user
            // can quickly book the same set of services again if desired.
            setSelectedDate("")
            setSelectedSlot("")
            setAvailableSlots([])
        } catch (error) {
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar agendamento",
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (!client) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                        <CardTitle className="text-2xl font-bold text-center">
                            {authMode === "login" ? "Entrar para Agendar" : "Cadastre-se"}
                        </CardTitle>
                        <CardDescription className="text-blue-100 text-center">
                            {authMode === "login"
                                ? "Faça login para agendar neste salão"
                                : "Preencha seus dados para criar sua conta"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-6">
                            {authMode === "login" ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Telefone ou Email</Label>
                                        <Input
                                            type="text"
                                            value={authLogin}
                                            onChange={e => setAuthLogin(e.target.value)}
                                            placeholder="Seu telefone ou email"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senha</Label>
                                        <Input
                                            type="password"
                                            value={authPassword}
                                            onChange={e => setAuthPassword(e.target.value)}
                                            placeholder="Sua senha"
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label>Telefone</Label>
                                        <Input
                                            type="tel"
                                            value={authLogin}
                                            onChange={e => setAuthLogin(e.target.value)}
                                            placeholder="(99) 99999-9999"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={authEmail}
                                            onChange={e => setAuthEmail(e.target.value)}
                                            placeholder="Seu email"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nome completo</Label>
                                        <Input
                                            type="text"
                                            value={authName}
                                            onChange={e => setAuthName(e.target.value)}
                                            placeholder="Seu nome"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data de nascimento</Label>
                                        <Input
                                            type="date"
                                            value={authBirthDate}
                                            onChange={e => setAuthBirthDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senha</Label>
                                        <Input
                                            type="password"
                                            value={authPassword}
                                            onChange={e => setAuthPassword(e.target.value)}
                                            placeholder="Sua senha"
                                            required
                                        />
                                    </div>
                                </>
                            )}
                            {authError && (
                                <div className="text-red-600 text-sm">{authError}</div>
                            )}
                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-600"
                                disabled={authLoading}
                            >
                                {authLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : authMode === "login" ? "Entrar" : "Cadastrar"}
                            </Button>
                        </form>
                        <div className="mt-4 text-center">
                            {authMode === "login" ? (
                                <span>
                                    Não tem conta?{" "}
                                    <button
                                        className="text-blue-600 underline"
                                        onClick={() => setAuthMode("register")}
                                    >
                                        Cadastre-se
                                    </button>
                                </span>
                            ) : (
                                <span>
                                    Já tem conta?{" "}
                                    <button
                                        className="text-blue-600 underline"
                                        onClick={() => setAuthMode("login")}
                                    >
                                        Entrar
                                    </button>
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Toaster />
            </div>
        )
    }

    if (!userId || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)

    // Get minimum date (today)
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Generate calendar days for current month
    const generateCalendarDays = () => {
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        const days = []

        // Add empty cells for days before the first day of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day)
            const dateStr = date.toISOString().split("T")[0]
            const isPast = date < today
            const isToday = dateStr === todayStr

            // Determine disabled state based on settings
            let isDisabled = isPast

            // If settings provided, apply closedDates, schedulingOpenUntil and publicSchedulingEnabled
            if (settings) {
                // publicSchedulingEnabled false disables all
                if (settings.publicSchedulingEnabled === false) {
                    isDisabled = true
                }

                // closedDates
                if (Array.isArray(settings.closedDates) && settings.closedDates.includes(dateStr)) {
                    isDisabled = true
                }

                // schedulingOpenUntil may be string or timestamp-like
                const so = settings.schedulingOpenUntil
                if (so) {
                    let soStr: string | null = null
                    if (typeof so === 'string') soStr = so
                    else if (typeof so === 'object') {
                        if (typeof (so as any).toDate === 'function') {
                            soStr = (so as any).toDate().toISOString().split('T')[0]
                        } else if (typeof (so as any).seconds === 'number') {
                            soStr = new Date((so as any).seconds * 1000).toISOString().split('T')[0]
                        }
                    }
                    if (soStr && dateStr > soStr) {
                        isDisabled = true
                    }
                }
            }

            days.push({
                day,
                date: dateStr,
                isPast,
                isToday,
                isSelected: dateStr === selectedDate,
                isDisabled
            })
        }

        return days
    }

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11)
                setCurrentYear(currentYear - 1)
            } else {
                setCurrentMonth(currentMonth - 1)
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0)
                setCurrentYear(currentYear + 1)
            } else {
                setCurrentMonth(currentMonth + 1)
            }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
            <div className="mx-auto max-w-4xl">
                <Card className="shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                        <CardTitle className="text-3xl font-bold text-center"> Agendar Horário</CardTitle>
                        <CardDescription className="text-blue-100 text-center">
                            Escolha seus serviços e horário preferido
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Services Selection */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-700">✨ Escolha seus serviços</Label>
                                {services.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">🔍 Nenhum serviço disponível</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {services.map((service) => (
                                            <div
                                                key={service.id}
                                                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedServices.some((s) => s.id === service.id)
                                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => handleServiceToggle(service)}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                                                        style={{
                                                            backgroundColor: selectedServices.some((s) => s.id === service.id) ? service.color : 'transparent',
                                                            borderColor: service.color
                                                        }}
                                                    >
                                                        {selectedServices.some((s) => s.id === service.id) && (
                                                            <span className="text-white text-sm">✓</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-semibold text-gray-800">{service.name}</h3>
                                                            <div
                                                                className="w-4 h-4 rounded-full"
                                                                style={{ backgroundColor: service.color }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-2xl font-bold text-green-600">
                                                                R$ {service.price.toFixed(2)}
                                                            </span>
                                                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                                                ⏱️ {service.duration} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Services Summary */}
                            {selectedServices.length > 0 && (
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">📋 Resumo do agendamento</h3>
                                            <p className="text-sm text-gray-600">{selectedServices.length} serviço(s) selecionado(s)</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600">
                                                R$ {totalPrice.toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                ⏱️ {totalDuration} minutos
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {selectedServices.map((service) => (
                                            <span
                                                key={service.id}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                                                style={{ backgroundColor: service.color }}
                                            >
                                                {service.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Date Selection */}
                            {selectedServices.length > 0 && (
                                <div className="space-y-4">
                                    <Label className="text-lg font-semibold text-gray-700">📅 Escolha a data</Label>

                                    {/* Month Navigation */}
                                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateMonth('prev')}
                                            className="h-10 w-10 p-0"
                                        >
                                            ←
                                        </Button>
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            {monthNames[currentMonth]} {currentYear}
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateMonth('next')}
                                            className="h-10 w-10 p-0"
                                        >
                                            →
                                        </Button>
                                    </div>

                                    {/* Calendar */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                        {/* Week days header */}
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {weekDays.map((day) => (
                                                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Calendar days */}
                                        <div className="grid grid-cols-7 gap-1">
                                                                    {generateCalendarDays().map((dayData, index) => (
                                                                        <div key={index} className="aspect-square">
                                                                            {dayData ? (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant={dayData.isSelected ? "default" : "ghost"}
                                                                                    className={`w-full h-full text-sm ${dayData.isDisabled
                                                                                            ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                                                                            : dayData.isToday
                                                                                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                                                                                : dayData.isSelected
                                                                                                    ? 'bg-blue-600 text-white'
                                                                                                    : 'hover:bg-blue-50'
                                                                                        }`}
                                                                                    disabled={dayData.isDisabled}
                                                                                    onClick={() => {
                                                                                        if (dayData.isDisabled) return
                                                                                        console.log("Frontend: Selected date:", dayData.date)
                                                                                        setSelectedDate(dayData.date)
                                                                                    }}
                                                                                >
                                                                                    {dayData.day}
                                                                                </Button>
                                                                            ) : (
                                                                                <div />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time Slots */}
                            {selectedDate && selectedServices.length > 0 && (
                                <div className="space-y-4">
                                    <Label className="text-lg font-semibold text-gray-700">🕐 Horários disponíveis</Label>
                                    {loadingSlots ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <span className="ml-2 text-gray-600">Carregando horários...</span>
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500">😔 Nenhum horário disponível para esta data</p>
                                            <p className="text-sm text-gray-400 mt-1">Tente escolher outra data</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                            {availableSlots.map((slot) => (
                                                <Button
                                                    key={slot}
                                                    type="button"
                                                    variant={selectedSlot === slot ? "default" : "outline"}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`h-12 text-sm font-medium ${selectedSlot === slot
                                                            ? 'bg-blue-600 text-white shadow-lg'
                                                            : 'border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {slot}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 shadow-lg"
                                    disabled={submitting || !selectedSlot}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Agendando...
                                        </>
                                    ) : (
                                        <>
                                            ✅ Confirmar Agendamento
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Toaster />
        </div>
    )
}
