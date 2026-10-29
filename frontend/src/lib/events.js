import { Moon, Rocket, Satellite, Sparkles, Eclipse } from 'lucide-react'
import { createLocalStore } from './localStore.js'

// Event types from docs/api-contracts.md, plus ISS passes which the API does not provide yet.
export const EVENT_TYPES = {
  moon_phase: { label: 'Moon phases', single: 'Moon phase', icon: Moon },
  meteor_shower: { label: 'Meteor showers', single: 'Meteor shower', icon: Sparkles },
  eclipse: { label: 'Eclipses', single: 'Eclipse', icon: Eclipse },
  launch: { label: 'Launches', single: 'Launch', icon: Rocket },
}
export const ISS_TYPE = { label: 'ISS passes', icon: Satellite }

export function typeInfo(type) {
  return EVENT_TYPES[type] ?? { label: type, single: type, icon: Sparkles }
}

// Saved events keep a copy of the event as it was when saved.
const savedStore = createLocalStore('tw-saved-events', [])
export const useSavedEvents = savedStore.useValue

export function toggleSavedEvent(event) {
  const saved = savedStore.get().some((e) => e.id === event.id)
  savedStore.set((list) => (saved ? list.filter((e) => e.id !== event.id) : [...list, event]))
  return !saved
}

// Reminders: { eventId, title, start_time, timezone, minutesBefore, status: 'pending' | 'sent' | 'missed' }
export const REMINDER_OPTIONS = [
  { minutes: 5, label: '5 minutes before' },
  { minutes: 15, label: '15 minutes before' },
  { minutes: 30, label: '30 minutes before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 180, label: '3 hours before' },
  { minutes: 1440, label: '1 day before' },
]

const reminderStore = createLocalStore('tw-reminders', [])
export const useReminders = reminderStore.useValue
export const getReminders = reminderStore.get

export function setReminder(event, minutesBefore) {
  reminderStore.set((list) => [
    ...list.filter((r) => r.eventId !== event.id),
    { eventId: event.id, title: event.title, start_time: event.start_time, timezone: event.timezone, minutesBefore, status: 'pending' },
  ])
}

export function updateReminder(eventId, changes) {
  reminderStore.set((list) => list.map((r) => (r.eventId === eventId ? { ...r, ...changes } : r)))
}

export function removeReminder(eventId) {
  reminderStore.set((list) => list.filter((r) => r.eventId !== eventId))
}

// Log of alerts shown in the notification centre (most recent first).
const logStore = createLocalStore('tw-notifications', [])
export const useNotificationLog = logStore.useValue

export function logNotification(message) {
  logStore.set((list) => [{ message, at: new Date().toISOString() }, ...list].slice(0, 20))
}
