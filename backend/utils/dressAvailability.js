function dressAvailability(value) {
  if (value === undefined) return true;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error('Availability must be true or false.');
}
module.exports = { dressAvailability };
