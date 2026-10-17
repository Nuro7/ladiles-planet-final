const appointmentRepository = require('../repositories/appointmentRepository');

/**
 * Appointment Service
 * Business logic for appointments and time slot management
 */
class AppointmentService {
    /* ─────────────────── TIME SLOTS ─────────────────── */

    /**
     * Get available time slots for a date
     */
    async getTimeSlotsForDate(date) {
        if (!date) throw new Error('Date is required');
        return await appointmentRepository.getTimeSlotsByDate(date);
    }

    /**
     * Get all time slots with optional date filter
     */
    async getAllTimeSlots(filters = {}) {
        return await appointmentRepository.getAllTimeSlots(filters);
    }

    /**
     * Create a time slot for a date
     */
    async createTimeSlot(data) {
        const { slot_date, start_time, end_time, max_bookings, notes } = data;

        if (!slot_date) throw new Error('slot_date is required');
        if (!start_time) throw new Error('start_time is required');
        if (!end_time) throw new Error('end_time is required');

        // Ensure start < end
        if (start_time >= end_time) {
            throw new Error('start_time must be before end_time');
        }

        return await appointmentRepository.createTimeSlot({
            slot_date,
            start_time,
            end_time,
            max_bookings: parseInt(max_bookings) || 1,
            notes: notes || null,
            is_available: true,
        });
    }

    /**
     * Update a time slot
     */
    async updateTimeSlot(id, data) {
        if (!id) throw new Error('Time slot ID is required');
        return await appointmentRepository.updateTimeSlot(id, data);
    }

    /**
     * Delete a time slot
     */
    async deleteTimeSlot(id) {
        if (!id) throw new Error('Time slot ID is required');
        return await appointmentRepository.deleteTimeSlot(id);
    }

    /* ─────────────────── APPOINTMENTS ─────────────────── */

    /**
     * Get all appointments with optional filters
     */
    async getAllAppointments(filters = {}) {
        return await appointmentRepository.getAllAppointments(filters);
    }

    /**
     * Get a single appointment by ID
     */
    async getAppointmentById(id) {
        const appt = await appointmentRepository.findById(id);
        if (!appt) throw new Error('Appointment not found');
        return appt;
    }

    /**
     * Create a new appointment, also increments the time slot booking count
     */
    async createAppointment(data) {
        const { client_name, client_email, appointment_date, start_time, end_time } = data;

        if (!client_name) throw new Error('client_name is required');
        if (!client_email) throw new Error('client_email is required');
        if (!appointment_date) throw new Error('appointment_date is required');
        if (!start_time) throw new Error('start_time is required');
        if (!end_time) throw new Error('end_time is required');

        // If a time_slot_id is provided, check availability and increment
        if (data.time_slot_id) {
            const slots = await appointmentRepository.getAllTimeSlots({ date: appointment_date });
            const slot = slots.find(s => s.id === data.time_slot_id);

            if (!slot) throw new Error('Time slot not found');
            if (!slot.is_available) throw new Error('This time slot is no longer available');

            const appointment = await appointmentRepository.create(data);
            await appointmentRepository.incrementBookingCount(data.time_slot_id);
            return appointment;
        }

        return await appointmentRepository.create(data);
    }

    /**
     * Update appointment
     */
    async updateAppointment(id, data) {
        if (!id) throw new Error('Appointment ID is required');
        return await appointmentRepository.update(id, data);
    }

    /**
     * Delete appointment (soft delete)
     */
    async deleteAppointment(id) {
        if (!id) throw new Error('Appointment ID is required');
        return await appointmentRepository.delete(id);
    }

    /**
     * Get booking stats summary
     */
    async getStats() {
        const all = await appointmentRepository.getAllAppointments();
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = all.filter(a => a.appointment_date === today);

        return {
            total: all.length,
            today: todayAppts.length,
            pending: all.filter(a => a.status === 'pending').length,
            confirmed: all.filter(a => a.status === 'confirmed').length,
            cancelled: all.filter(a => a.status === 'cancelled').length,
            completed: all.filter(a => a.status === 'completed').length,
        };
    }
}

module.exports = new AppointmentService();
