const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

/**
 * Appointment Routes
 * Base: /api/appointments
 */

/* ─── Time Slot Routes ─── */

// GET  /api/appointments/slots/all   – all slots (optionally ?date=YYYY-MM-DD)
router.get('/slots/all', appointmentController.getAllTimeSlots);

// GET  /api/appointments/slots?date=YYYY-MM-DD   – slots for a specific date
router.get('/slots', appointmentController.getTimeSlotsByDate);

// POST /api/appointments/slots   – create a new slot
router.post('/slots', appointmentController.createTimeSlot);

// PUT  /api/appointments/slots/:id   – update a slot
router.put('/slots/:id', appointmentController.updateTimeSlot);

// DELETE /api/appointments/slots/:id   – delete a slot
router.delete('/slots/:id', appointmentController.deleteTimeSlot);

/* ─── Appointment Routes ─── */

// GET /api/appointments/stats   – statistics
router.get('/stats', appointmentController.getStats);

// GET /api/appointments   – list all (optionally ?date=YYYY-MM-DD&status=pending)
router.get('/', appointmentController.getAllAppointments);

// GET /api/appointments/:id   – single appointment
router.get('/:id', appointmentController.getAppointmentById);

// POST /api/appointments   – create appointment
router.post('/', appointmentController.createAppointment);

// PUT /api/appointments/:id   – update appointment
router.put('/:id', appointmentController.updateAppointment);

// DELETE /api/appointments/:id   – delete appointment
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;
