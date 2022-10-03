/**
 * @author Uzziel Kibet
 * @licence MIT
 * 
 * Check Security best practices from the link below and make sure they apply
 * 
 * @link https://blog.risingstack.com/node-js-security-checklist/
 * @link https://github.com/expressjs/express/tree/master/examples
 */

const dotenv = require('dotenv').config({ path: '../.env' })
const {Directus} = require('@directus/sdk')
const express = require('express')
const app = express()
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const cookieSession = require('cookie-session')
const cookieParser = require('cookie-parser')

//Communicate with directus backend for Content Management
const directus = new Directus(process.env.BACKEND_URL,{
  auth:{
    staticToken: process.env.API_KEY
  }
})

const dbAuth = new Directus(process.env.BACKEND_URL)

//Limit some routes
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to create 5 account requests per `window` (here, per hour)
  message:
    'Too many accounts created from this IP for this route, please try again after an hour',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

//Allow requests from any origin
app.use(cors())

//Protect against common vulnerabilities
app.use(helmet())

//Intercept json and url encoded entities
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//Cookie parser
app.use(cookieParser('qwmoiVcx87'))

//Cookie settings
app.use(cookieSession({
  name: 'user',
  keys: ['poQWcsf51vsDUI','AsvcGFuyPiM90JcxX431'],

  // Cookie Options
  maxAge: 720 * 60 * 60 * 1000 // 30 days
}))

//Restrict unknown users
const restrict = (req, res, next) => {
  if (req.signedCookies.user) {
    next()
  } else {
    req.session.error = 'Access denied!'
    res.redirect('/login')
  }
}

//Send an email invitation to the user to join the project
app.post('/api/tutor-invite', createLimiter, async(req, res) => {
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
app.post('/api/client', createLimiter, async(req, res) => {
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
      message: "Unable to register your account or account already exists.",
      reason: err
    }
    
    res.json(response)

  })

})

//Login a user
app.post('/api/login', createLimiter, async(req, res) => {
  const email = req.body.email
  const password = req.body.password

  //Authenticate with directus
  dbAuth.auth.login({
    email,
    password
  }).then(() => {
    res.cookie('user', email, {signed: true})
    
    const data = {
      "loggedIn":true
    }

    res.json(data)

  }).catch(error => {
    const data = {
      "loggedIn":false,
      "reason":error
    }

    res.json(data)
  })
  
})

//Register new students
app.post('/api/register', createLimiter, async(req, res) => {})

module.exports = app
