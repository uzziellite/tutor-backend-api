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
const cryptoJS = require('crypto-js')

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

app.use(cors())

//Protect against common vulnerabilities
app.use(helmet())

//Intercept json and url encoded entities
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//Decrypt email
const decrypt = (cipher) => {
  return cryptoJS.AES.decrypt(cipher,process.env.CIPHER_KEY_1)
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

//Login a user to the app
app.post('/api/login', async(req, res) => {
  const email = req.body.email
  const password = req.body.password

  //Authenticate with directus
  dbAuth.auth.login({
    email,
    password
  }).then(() => {
    //Get student id
    directus.items('directus_users').readByQuery({
      filter:{
        "email":{
          "_eq":email
        }
      },
      fields:['id']
    }).then(resp => {
      
      const _lxc = cryptoJS.AES.encrypt(resp.data[0].id,process.env.CIPHER_KEY_1).toString()

      const data = {
        "loggedIn":true,
        "_lxc": _lxc,
        "_xcc": 'user'
      }

      res.json(data)

    }).catch((err) => {
      console.error(err)
    })
    

  }).catch(error => {
    const data = {
      "loggedIn":false,
      "reason":error
    }

    res.json(data)
  })
  
})

//Fetch student data
app.get('/api/student-data', async(req, res) => {
  const _lxc = decrypt(req.body.lxc)
  const subject = req.body.subject

  if(email !== 0){
    directus.items('tut_track_student').readByQuery({
      filter:{
        "_and":[
          {
            "student":{
              "email":{
                "_eq":_lxc
              }
            }
          },
          {
            "question":{
              "sub_topic":{
                "topic":{
                  "subject":{
                    "id":{
                      "_eq":subject
                    }
                  }
                }
              }
            }
          }
        ]
      },
      meta:"filter_count"
    }).then(response => {
      res.json(response.data)
    }).catch(err => {
      res.json({"reason":err})
    })
  }else{
    res.json({"reason":"login"})
  }
})

//Save student progress
app.post('/api/student-data', async(req,res) => {
  const _lxc = decrypt(req.body._lxc)
  const time = req.body.time
  const id = req.body.id
  const scored = req.body.correct

  await directus.items('tut_track_student').createOne({
    correctly_answered:scored,
    time_taken:time,
    question:id,
    student:_lxc
  }).then(() => {
    res.json({"success":"Data saved successfully"})
  }).catch(err => {
    res.json({"error":err})
  })
})

module.exports = app
