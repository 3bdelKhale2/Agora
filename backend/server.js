require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const vendorProfileRoutes = require('./routes/vendorProfiles');
const vendorParticipationRoutes = require('./routes/vendorParticipations');
const registrationRoutes = require('./routes/registrations');
const courtRoutes = require('./routes/courts');
const paymentsRoutes = require('./routes/payments');
const bodyParser = require('body-parser');
const { transporter } = require('./utils/mailer');

const gymSessionsRoutes = require('./routes/gymSessions');
const errorHandler = require('./middleware/error');

// express app
const app = express()

// middleware
// Raw body needed for Stripe webhook signature verification BEFORE express.json()
app.use('/api/payments/webhook', bodyParser.raw({ type: 'application/json' }));
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

// routes

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/vendor-profiles', vendorProfileRoutes);
app.use('/api/vendor-participations', vendorParticipationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentsRoutes);

app.use('/api/gym-sessions', gymSessionsRoutes);
app.use('/api/courts', courtRoutes);

// Centralized error handler
app.use(errorHandler);

// connect to db
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('connected to database')
    // Verify SMTP transporter
    transporter.verify((err, success) => {
      if (err) {
        console.error('[smtp] verification failed:', err.message);
      } else {
        console.log('[smtp] transporter ready');
      }
    });
    // listen to port
    app.listen(process.env.PORT, () => {
      console.log('listening for requests on port', process.env.PORT)
    })
  })
  .catch((err) => {
    console.log(err)
  })