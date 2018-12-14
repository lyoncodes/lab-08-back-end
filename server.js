'use strict'

// dependencies
const express = require('express')
const cors = require('cors')
const superagent = require('superagent')
const pg = require('pg')

// env variables
require('dotenv').config()

// App
const app = express()

app.use(cors())

const PORT = process.env.PORT || 3000

// postgres server
const client = new pg.Client(process.env.DATABASE_URL)
client.connect()
client.on('error', err => console.error(err))

// Error Handling -- "Sorry, something went wrong."
function handleError (res) {
  res.status(500).send('Sorry, something went wrong.')
}

// Routes
// check our db for requested data
// then if we have it, send it back
// otherwise get it from google
// then normalize it
// store it in our cityexplorer database
// then send it back


app.get('/location', getLocation)
app.get('/movies', getMovies)
app.get('/yelp', getYelp)

// Handlers
function getLocation (req, res) {
  let lookupHandler = {
    cacheHit: (data) => {
      console.log('Location retreived from database')
      res.status(200).send(data.rows[0])
    },
    cacheMiss: (query) => {
      return fetchLocation(query)
        .then(result => {
          res.send(result)
        })
    }
  }
  lookupLocation(req.query.data, lookupHandler)
}
function lookupLocation (query, handler) {
  // let query = req.query.data
  const SQL = 'SELECT * FROM locations WHERE search_query=$1'
  const values = [query]
  return client.query(SQL, values)
    .then(data => {
      if (data.rowCount) {
        handler.cacheHit(data)
      } else {
        handler.cacheMiss(query)
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err)
    })
}
function fetchLocation (query) {
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`
  return superagent.get(URL)
    .then(result => {
      console.log('got it from Goog')

      let location = new Location(result.body.results[0])
      let SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude)VALUES($1, $2, $3, $4)`

      return client.query(SQL, [query, location.formatted_query, location.latitude, location.longitude])
        .then(() => {
          return location
        })
    })
}

function getYelp (req, res) {
  return searchYelp(req.query.data)
    .then(yelpData => {
      res.send(yelpData)
    })
}

function getMovies (req, res) {
  return searchMovies(req.query.data)
    .then(moviesData => {
      res.send(moviesData)
    })
}

// Constructors
function Location (location, query) {
  this.search_query = query
  this.formatted_query = location.formatted_address
  this.latitude = location.geometry.location.lat
  this.longitude = location.geometry.location.lng
}

function Yelp (business) {
  this.name = business.name
  this.image_url = business.image_url
  this.price = business.price
  this.rating = business.rating
  this.url = business.url
}

function Movie (movie) {
  this.title = movie.title
  this.overview = movie.overview
  this.average_votes = movie.vote_average
  this.total_votes = movie.vote_count
  if (movie.poster_path) {
    this.image_url = `http://image.tmdb.org/t/p/w200_and_h300_bestv2${movie.poster_path}`
  } else {
    this.image_url = null
  }
  this.popularity = movie.popularity
  this.released_on = movie.release_date
}

// Search Functions
// function searchToLatLong (query) {
//   const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`
//   return superagent.get(url)
//     .then(geoData => {
//       const location = new Location(geoData.body.results[0], query)
//       return location
//     })
//     .catch(err => console.error(err))
// }

function searchYelp (query) {
  const url = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${query.latitude}&longitude=${query.longitude}`
  return superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(yelpData => {
      return yelpData.body.businesses.map(business => new Yelp(business))
    })
}

function searchMovies (query) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${query.search_query}`
  return superagent.get(url)
    .then(moviesData => {
      console.log(moviesData.body)
      return moviesData.body.results.map(movie => new Movie(movie))
    })
}

// Listener
app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`)
})

// app.get('/location', (req, res) => {
//   let query = req.query.data
//   // Check the Database for Data
//   const SQL = 'SELECT * FROM locations WHERE search_query=$1'
//   const values = [query]
//   return client.query(SQL, values)
//     .then(data => {
//       if (data.rowCount) {
//         console.log('Location retrieved from Google')
//         res.status(200).send(data)
//         // TODO: normalize
//       } else {
//         const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`

//         return superagent.get(URL)
//           .then(result => {
//             console.log('Location retrieved from Google')
//             let location = new Location(result.body.results[0])
//             let SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4)`
//             return client.query(SQL, [query, location.formatted_query, location.latitude, location.longitude])
//               .then(() => {
//                 res.status(200).send(location)
//               })
//           })
//       }
//     })
//     .catch(err => {
//       console.error(err)
//       res.send(err)
//     })
// })
