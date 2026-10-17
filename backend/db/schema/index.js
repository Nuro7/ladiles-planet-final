/**
 * Database Schema Index
 * Exports all database table schemas
 */

const { dresses } = require('./dresses');
const { videos } = require('./videos');
const { users } = require('./users');
const { bride, brideImage } = require('./brides');
const { appointments, timeSlots } = require('./appointments');

module.exports = {
    dresses,
    videos,
    users,
    bride,
    brideImage,
    appointments,
    timeSlots,
};
