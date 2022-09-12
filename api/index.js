import {Directus} from "@directus/sdk" 
const app = require('express')()
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const dotenv = require('dotenv')

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 100, // Limit each IP to 10 requests per `window` (here, per 60 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Set path to .env file
dotenv.config({ path: './.env' })

// Apply the rate limiting middleware to all requests
app.use(limiter)

//Allow requests from any origin
app.use(cors())

//Protect against common vulnerabilities
app.use(helmet())

//Intercept json and url encoded entities
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// custom 404
/*app.use((req, res, next) => {
  res.status(404).send('Ooopsie dooopsie, there is nothing here')
})*/

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

module.exports = app
