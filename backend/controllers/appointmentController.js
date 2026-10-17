const appointmentService = require('../services/appointmentService');

/**
 * Appointment Controller
 * Handles HTTP requests for time slots and appointments
 */
const appointmentController = {
    /* ─────────────────── TIME SLOTS ─────────────────── */

    /** GET /api/appointments/slots?date=YYYY-MM-DD */
    async getTimeSlotsByDate(req, res) {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ success: false, error: 'date query param is required' });
            }
            const slots = await appointmentService.getTimeSlotsForDate(date);
            return res.json({ success: true, data: slots, count: slots.length });
        } catch (error) {
            console.error('appointmentController.getTimeSlotsByDate:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    /** GET /api/appointments/slots/all */
    async getAllTimeSlots(req, res) {
        try {
            const filters = {};
            if (req.query.date) filters.date = req.query.date;

            const slots = await appointmentService.getAllTimeSlots(filters);
            return res.json({ success: true, data: slots, count: slots.length });
        } catch (error) {
            console.error('appointmentController.getAllTimeSlots:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    /** POST /api/appointments/slots */
    async createTimeSlot(req, res) {
        try {
            const slot = await appointmentService.createTimeSlot(req.body);
            return res.status(201).json({ success: true, data: slot, message: 'Time slot created successfully' });
        } catch (error) {
            console.error('appointmentController.createTimeSlot:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    /** PUT /api/appointments/slots/:id */
    async updateTimeSlot(req, res) {
        try {
            const { id } = req.params;
            const slot = await appointmentService.updateTimeSlot(id, req.body);
            return res.json({ success: true, data: slot, message: 'Time slot updated successfully' });
        } catch (error) {
            console.error('appointmentController.updateTimeSlot:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    /** DELETE /api/appointments/slots/:id */
    async deleteTimeSlot(req, res) {
        try {
            const { id } = req.params;
            const slot = await appointmentService.deleteTimeSlot(id);
            return res.json({ success: true, data: slot, message: 'Time slot deleted successfully' });
        } catch (error) {
            console.error('appointmentController.deleteTimeSlot:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    /* ─────────────────── APPOINTMENTS ─────────────────── */

    /** GET /api/appointments */
    async getAllAppointments(req, res) {
        try {
            const filters = {};
            if (req.query.date) filters.date = req.query.date;
            if (req.query.status) filters.status = req.query.status;

            const appts = await appointmentService.getAllAppointments(filters);
            return res.json({ success: true, data: appts, count: appts.length });
        } catch (error) {
            console.error('appointmentController.getAllAppointments:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    /** GET /api/appointments/stats */
    async getStats(req, res) {
        try {
            const stats = await appointmentService.getStats();
            return res.json({ success: true, data: stats });
        } catch (error) {
            console.error('appointmentController.getStats:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    /** GET /api/appointments/:id */
    async getAppointmentById(req, res) {
        try {
            const { id } = req.params;
            const appt = await appointmentService.getAppointmentById(id);
            return res.json({ success: true, data: appt });
        } catch (error) {
            console.error('appointmentController.getAppointmentById:', error.message);
            return res.status(404).json({ success: false, error: error.message });
        }
    },

    /** POST /api/appointments */
    async createAppointment(req, res) {
        try {
            const appt = await appointmentService.createAppointment(req.body);
            return res.status(201).json({ success: true, data: appt, message: 'Appointment booked successfully' });
        } catch (error) {
            console.error('appointmentController.createAppointment:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    /** PUT /api/appointments/:id */
    async updateAppointment(req, res) {
        try {
            const { id } = req.params;
            const appt = await appointmentService.updateAppointment(id, req.body);
            return res.json({ success: true, data: appt, message: 'Appointment updated successfully' });
        } catch (error) {
            console.error('appointmentController.updateAppointment:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },

    /** DELETE /api/appointments/:id */
    async deleteAppointment(req, res) {
        try {
            const { id } = req.params;
            const appt = await appointmentService.deleteAppointment(id);
            return res.json({ success: true, data: appt, message: 'Appointment deleted successfully' });
        } catch (error) {
            console.error('appointmentController.deleteAppointment:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }
    },
};

module.exports = appointmentController;
