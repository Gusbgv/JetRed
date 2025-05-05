const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireManager } = require('../middleware/auth');

// 🔐 Admin: View all bookings
router.get('/bookings', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id AS booking_id,
        u.full_name AS passenger_name,
        f.origin,
        f.destination,
        f.departure_time,
        f.arrival_time,
        b.booking_time
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN flights f ON b.flight_id = f.id
      ORDER BY b.booking_time DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while fetching bookings' });
  }
});

// ✈️ Get all flights
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM flights');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✈️ Book a flight
router.post('/book', async (req, res) => {
  const { user_id, flight_id } = req.body;

  try {
    const flightCheck = await pool.query('SELECT seats_available FROM flights WHERE id = $1', [flight_id]);
    if (flightCheck.rows[0].seats_available <= 0) {
      return res.status(400).json({ error: 'No seats available' });
    }

    await pool.query('INSERT INTO bookings (user_id, flight_id) VALUES ($1, $2)', [user_id, flight_id]);

    await pool.query('UPDATE flights SET seats_available = seats_available - 1 WHERE id = $1', [flight_id]);

    res.json({ message: 'Flight booked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 👤 Get bookings for a user
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.flight_id, f.origin, f.destination, f.departure_time, f.arrival_time
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.user_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Cancel a booking (and restore seat)
router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const flightIdResult = await pool.query('SELECT flight_id FROM bookings WHERE id = $1', [id]);
    const flightId = flightIdResult.rows[0]?.flight_id;

    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

    if (flightId) {
      await pool.query('UPDATE flights SET seats_available = seats_available + 1 WHERE id = $1', [flightId]);
    }

    res.json({ message: 'Booking canceled successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while canceling booking' });
  }
});

module.exports = router;
