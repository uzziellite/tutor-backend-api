const dotenv = require('dotenv').config({ path: '../.env' })
const {Directus} = require('@directus/sdk')
const express = require('express')
const app = express()
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 60 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})


// Apply the rate limiting middleware to all requests
app.use(limiter)

//Allow requests from any origin
app.use(cors())

//Protect against common vulnerabilities
app.use(helmet())

//Intercept json and url encoded entities
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const directus = new Directus(process.env.BACKEND_URL,{
  auth:{
    staticToken: process.env.API_KEY
  }
})

//Send an email invitation to the user to join the project
app.post('/api/tutor-invite', async(req, res) => {
  const email = req.body.email

  await directus.users.invites.send(email, process.env.TUTOR_ROLE).then(() => {
    
    const response = {
      type: "success",
      message: "Please check your email address to finish setting up your account"
    }

    res.json(response)

  }).catch((err) => {
    
    const response = {
      type: "error",
      message: "Unable to register your tutor account. Please try again"
    }
    
    res.json(response)

  })

})

//Create a new user
app.post('/api/client', async(req, res) => {
  const email = req.body.email
  const password = req.body.password
  const first_name = req.body.first_name
  const last_name = req.body.last_name
  const phone_number = req.body.phone_number
  const location = req.body.location
  const address = req.body.address
  const role = process.env.CLIENT_ROLE

  await directus.users.createOne({
    email,
    password,
    first_name,
    last_name,
    phone_number,
    location,
    address,
    role
  }).then(() => {
    
    const response = {
      type: "success",
      message: "Account successfully setup. You may login"
    }

    res.json(response)

  }).catch((err) => {
    
    const response = {
      type: "error",
      message: "Unable to register your account. Please try again"
    }
    
    res.json(response)

  })

})

//Request password reset
app.post('/api/client/password/request', async (req,res) => {
  const email = req.body.email


  await directus.auth.password.request(
    email,
    process.env.PUBLIC_WEBAPP
  ).then(() => {
    
    const response = {
      type: "success",
      message: "If you are registered with us, an email has already been sent to you with further instructions"
    }

    res.json(response)

  }).catch((err) => {
    
    const response = {
      type: "error",
      message: "Sorry, we do not recognize your account"
    }
    
    res.json(response)

  })
})


//Reset the password
app.post('/api/client/password/reset', async (req,res) => {
  const token = req.body.token
  const password = req.body.password

  await directus.auth.password.reset(token, password).then(() => {
    
    const response = {
      type: "success",
      message: "Password reset successfully. Please login"
    }

    res.json(response)

  }).catch((err) => {
    
    const response = {
      type: "error",
      message: "Unable to reset password at the moment. Please try again"
    }
    
    res.json(response)

  })
})

module.exports = app
