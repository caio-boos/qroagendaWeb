export interface Service {
  id: string
  name: string
  price: number
  duration: number // in minutes
  userId: string
}

export interface Client {
  id?: string
  name?: string
  phone: string
  notes?: string
  userId: string
}

export interface Appointment {
  client: {
    clientId: string
    phone: string
    name?: string
  }
  createdAt: any // Firestore timestamp
  date: string // YYYY-MM-DD format
  services: Array<{
    id: string
    name: string
    duration: number
    price: number
  }>
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  totalDuration: number
  totalPrice: number
  userId: string
}

export interface Settings {
  workingHours: {
    start: string // HH:mm format
    end: string // HH:mm format
  }
  lunchBreak: {
    start: string // HH:mm format
    end: string // HH:mm format
  }
  closedDates: string[] // YYYY-MM-DD format
  publicSchedulingEnabled: boolean
}
