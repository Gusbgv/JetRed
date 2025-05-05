const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireManager } = require('../middleware/auth');

// 🔍 Search users by name or email
router.get('/users', authenticateToken, requireManager, async (req, res) => {
  const search = req.query.search || '';
  try {
    const result = await pool.query(
      `SELECT id, full_name, email FROM users
       WHERE full_name ILIKE $1 OR email ILIKE $1
       ORDER BY full_name`,
      [`%${search}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get bookings for a user
router.get('/users/:id/bookings', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id AS booking_id, f.origin, f.destination, f.departure_time, f.arrival_time
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.user_id = $1
       ORDER BY f.departure_time`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✈️ Book flight for a user
router.post('/users/:id/book', authenticateToken, requireManager, async (req, res) => {
  const { flight_id } = req.body;
  const user_id = req.params.id;

  try {
    const checkSeats = await pool.query('SELECT seats_available FROM flights WHERE id = $1', [flight_id]);
    if (checkSeats.rows[0].seats_available <= 0) {
      return res.status(400).json({ error: 'No seats available' });
    }

    await pool.query('INSERT INTO bookings (user_id, flight_id) VALUES ($1, $2)', [user_id, flight_id]);
    await pool.query('UPDATE flights SET seats_available = seats_available - 1 WHERE id = $1', [flight_id]);

    res.json({ message: 'Flight booked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Cancel booking for a user
router.delete('/users/:id/bookings/:bookingId', authenticateToken, requireManager, async (req, res) => {
  const { id, bookingId } = req.params;

  try {
    const flightIdRes = await pool.query('SELECT flight_id FROM bookings WHERE id = $1 AND user_id = $2', [bookingId, id]);
    const flight_id = flightIdRes.rows[0]?.flight_id;

    await pool.query('DELETE FROM bookings WHERE id = $1 AND user_id = $2', [bookingId, id]);

    if (flight_id) {
      await pool.query('UPDATE flights SET seats_available = seats_available + 1 WHERE id = $1', [flight_id]);
    }

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
