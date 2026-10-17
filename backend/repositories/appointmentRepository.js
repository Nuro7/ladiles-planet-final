const { db } = require('../db');
const { appointments, timeSlots } = require('../db/schema');
const { eq, and, desc, asc } = require('drizzle-orm');

/**
 * Appointment Repository
 * Handles all database operations for appointments and time_slots tables
 */
class AppointmentRepository {
    /* ─────────────────── TIME SLOTS ─────────────────── */

    /**
     * Get all time slots for a specific date
     */
    async getTimeSlotsByDate(date) {
        try {
            return await db
                .select()
                .from(timeSlots)
                .where(and(eq(timeSlots.slot_date, date), eq(timeSlots.is_deleted, false)))
                .orderBy(asc(timeSlots.start_time));
        } catch (error) {
            console.error('AppointmentRepo.getTimeSlotsByDate error:', error);
            throw new Error(`Failed to fetch time slots: ${error.message}`);
        }
    }

    /**
     * Get all time slots (optionally filtered by date range)
     */
    async getAllTimeSlots(filters = {}) {
        try {
            const conditions = [eq(timeSlots.is_deleted, false)];

            if (filters.date) {
                conditions.push(eq(timeSlots.slot_date, filters.date));
            }

            return await db
                .select()
                .from(timeSlots)
                .where(and(...conditions))
                .orderBy(asc(timeSlots.slot_date), asc(timeSlots.start_time));
        } catch (error) {
            console.error('AppointmentRepo.getAllTimeSlots error:', error);
            throw new Error(`Failed to fetch time slots: ${error.message}`);
        }
    }

    /**
     * Create a new time slot
     */
    async createTimeSlot(data) {
        try {
            const result = await db
                .insert(timeSlots)
                .values({
                    slot_date: data.slot_date,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    max_bookings: data.max_bookings ?? 1,
                    is_available: data.is_available ?? true,
                    notes: data.notes || null,
                })
                .returning();

            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.createTimeSlot error:', error);
            throw new Error(`Failed to create time slot: ${error.message}`);
        }
    }

    /**
     * Update a time slot
     */
    async updateTimeSlot(id, data) {
        try {
            const dataToUpdate = { updated_at: new Date() };
            if (data.start_time !== undefined) dataToUpdate.start_time = data.start_time;
            if (data.end_time !== undefined) dataToUpdate.end_time = data.end_time;
            if (data.max_bookings !== undefined) dataToUpdate.max_bookings = data.max_bookings;
            if (data.is_available !== undefined) dataToUpdate.is_available = data.is_available;
            if (data.notes !== undefined) dataToUpdate.notes = data.notes;

            const result = await db
                .update(timeSlots)
                .set(dataToUpdate)
                .where(eq(timeSlots.id, id))
                .returning();

            if (result.length === 0) throw new Error('Time slot not found');
            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.updateTimeSlot error:', error);
            throw new Error(`Failed to update time slot: ${error.message}`);
        }
    }

    /**
     * Soft delete a time slot
     */
    async deleteTimeSlot(id) {
        try {
            const result = await db
                .update(timeSlots)
                .set({ is_deleted: true, updated_at: new Date() })
                .where(eq(timeSlots.id, id))
                .returning();

            if (result.length === 0) throw new Error('Time slot not found');
            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.deleteTimeSlot error:', error);
            throw new Error(`Failed to delete time slot: ${error.message}`);
        }
    }

    /**
     * Increment booking count on a time slot
     */
    async incrementBookingCount(id) {
        try {
            const slot = await db.select().from(timeSlots).where(eq(timeSlots.id, id)).limit(1);
            if (!slot.length) throw new Error('Time slot not found');

            const newCount = slot[0].current_bookings + 1;
            const isAvailable = newCount < slot[0].max_bookings;

            const result = await db
                .update(timeSlots)
                .set({ current_bookings: newCount, is_available: isAvailable, updated_at: new Date() })
                .where(eq(timeSlots.id, id))
                .returning();

            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.incrementBookingCount error:', error);
            throw new Error(`Failed to update booking count: ${error.message}`);
        }
    }

    /* ─────────────────── APPOINTMENTS ─────────────────── */

    /**
     * Get all appointments with optional filters
     */
    async getAllAppointments(filters = {}) {
        try {
            const conditions = [eq(appointments.is_deleted, false)];

            if (filters.date) {
                conditions.push(eq(appointments.appointment_date, filters.date));
            }
            if (filters.status) {
                conditions.push(eq(appointments.status, filters.status));
            }

            return await db
                .select()
                .from(appointments)
                .where(and(...conditions))
                .orderBy(asc(appointments.appointment_date), asc(appointments.start_time));
        } catch (error) {
            console.error('AppointmentRepo.getAllAppointments error:', error);
            throw new Error(`Failed to fetch appointments: ${error.message}`);
        }
    }

    /**
     * Get appointment by ID
     */
    async findById(id) {
        try {
            const result = await db
                .select()
                .from(appointments)
                .where(eq(appointments.id, id))
                .limit(1);

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('AppointmentRepo.findById error:', error);
            throw new Error(`Failed to fetch appointment: ${error.message}`);
        }
    }

    /**
     * Create a new appointment
     */
    async create(data) {
        try {
            const result = await db
                .insert(appointments)
                .values({
                    client_name: data.client_name,
                    client_email: data.client_email,
                    client_phone: data.client_phone || null,
                    appointment_date: data.appointment_date,
                    time_slot_id: data.time_slot_id || null,
                    start_time: data.start_time,
                    end_time: data.end_time,
                    service_type: data.service_type || 'consultation',
                    notes: data.notes || null,
                    status: data.status || 'pending',
                    metadata: data.metadata || {},
                })
                .returning();

            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.create error:', error);
            throw new Error(`Failed to create appointment: ${error.message}`);
        }
    }

    /**
     * Update appointment status or details
     */
    async update(id, data) {
        try {
            const dataToUpdate = { updated_at: new Date() };
            if (data.status !== undefined) dataToUpdate.status = data.status;
            if (data.notes !== undefined) dataToUpdate.notes = data.notes;
            if (data.client_name !== undefined) dataToUpdate.client_name = data.client_name;
            if (data.client_email !== undefined) dataToUpdate.client_email = data.client_email;
            if (data.client_phone !== undefined) dataToUpdate.client_phone = data.client_phone;

            const result = await db
                .update(appointments)
                .set(dataToUpdate)
                .where(eq(appointments.id, id))
                .returning();

            if (result.length === 0) throw new Error('Appointment not found');
            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.update error:', error);
            throw new Error(`Failed to update appointment: ${error.message}`);
        }
    }

    /**
     * Soft delete an appointment
     */
    async delete(id) {
        try {
            const result = await db
                .update(appointments)
                .set({ is_deleted: true, updated_at: new Date() })
                .where(eq(appointments.id, id))
                .returning();

            if (result.length === 0) throw new Error('Appointment not found');
            return result[0];
        } catch (error) {
            console.error('AppointmentRepo.delete error:', error);
            throw new Error(`Failed to delete appointment: ${error.message}`);
        }
    }
}

module.exports = new AppointmentRepository();
