const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true})
.then(() => {console.log("Connected to database!")})
.catch(err => console.log(err));

// Create schema for saving user
var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  descrp: {
    type: String,
    default: "n/a"
  },
  duration: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: new Date
  }
});

var User = mongoose.model("User", userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create a new user API
app.post('/api/exercise/add-user', (req, res, next) => {
  let inputUser = req.body.user;
  // Check if the entered username is alread taken
  User.find({username: inputUser}, (err, data) => {
    if(err) {return next(err)};
    // If username is already taken
    if(data.length > 0) {
      return res.send("username already taken");
    } else {
      let user = new User({
        username: inputUser,
        userId: Math.random().toString(36).substr(2, 6)
      });
      // Save user to database
      user.save((err, data) => {
        if(err){ return res.send(err);};
        res.json({username: data["username"], _id: data["userId"]});
      })  
    }
  })
})

// Add exercise
app.post("/api/exercise/create-exercise", (req, res, next) => {
  let incomingData = {
    id: req.body.uid,
    desc: req.body.descrip,
    duration: req.body.duration,
    date: req.body.date
  }
  User.find({userId: incomingData["id"]}, (err, data) => {
    if(err){return next(err);};
    if(data.length < 1) {
      res.send("invalid id")
    } else {
      User.findOneAndUpdate(
        {userId: incomingData["id"]},
          {$set:
           {descrp: incomingData["desc"],
            duration: incomingData["duration"],
            date: incomingData["date"]
           }
          }, (err, data) => {
        if(err){return next(err);};
        res.json({
          username: data["username"],
          description: data["descrp"],
          duration: data["duration"],
          _id: data["userId"],
          date: data["date"].toDateString()
         });
      });
    }
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
