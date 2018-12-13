'use strict'

// dependencies
const express = require('express')
const cors = require('cors')
const superagent = require('superagent')

// env variables
require('dotenv').config()

const PORT = process.env.PORT || 3000

// App
const app = express()

app.use(cors())

// Error Handling -- "Sorry, something went wrong."
function handleError (res) {
  res.status(500).send('Sorry, something went wrong.')
}

// Routes
// Handlers
// Constructors
// Search Functions
// Bad Path

// Listener
app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`)
})
