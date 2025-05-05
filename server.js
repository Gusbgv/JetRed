const flightRoutes = require('./routes/flights');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/flights', flightRoutes);

// Connect routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('JetRed backend running!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
