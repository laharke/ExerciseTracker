const express = require("express");
const app = express();
const cors = require("cors");
let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
let validator = require("validator");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Mongo config
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/mongo", (req, res) => {
  console.log(mongoose.connection.readyState);
  res.send("Mongo Connection: " + mongoose.connection.readyState);
});

//Deberia tener 2 schemas, uno para usuarios y otro para exercises
//El userSchema solo tiene uncampo que es username.
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: false,
  },
});
const User = mongoose.model("User", userSchema);
//El exercisesSchema tiene 3 campos: username, description, duration, date
const exercisesSchema = new mongoose.Schema({
  user_id: String,
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: Date,
});
const Exercises = mongoose.model("Exercises", exercisesSchema);

//Routing
// /users post
app.post("/api/users", (req, res) => {
  let userName = req.body.username;
  let user = new User({
    username: userName,
  });
  user
    .save()
    .then((doc) => {
      res.json({ username: doc.username, _id: doc._id });
    })
    .catch((err) => {
      console.error(err);
    });
});
// /users get
app.get("/api/users", (req, res) => {
  User.find()
    .then((docs) => {
      res.send(docs);
    })
    .catch((err) => {
      console.error(err);
    });
});

// /users/:_id/exercises post
//aca voy a llegar con :_id, description, duration, y date (NO REQUIRED -> uso default)
app.post("/api/users/:_id/exercises", async (req, res) => {
  let id = req.params._id;

  //ASI ME DEVUELVE EL USER
  let user = await User.findById(id).exec();
  if(user){
    //Ahora agrego el exercise
    let exercise = new Exercises({
      user_id: id,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date ? new Date(req.body.date) : new Date()
    })
    exercise
    .save()
    .then((doc) => {
      res.json({
        _id: doc.user_id,
        username: user.username,
        date: doc.date.toDateString(),
        duration: doc.duration,
        description: doc.description
      });
    })
    }else{
    res.send('User not found')
  }
});

//get /api/users/:_id/logs
app.get("/api/users/:_id/logs", async (req, res) => {
  var ObjectId = require('mongodb').ObjectId; 
  var id = req.params._id;       
  var o_id = new ObjectId(id);

  //Parametros extra
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  let dateObj = {}
  if(from) {
      dateObj["$gte"] = new Date(from)
  }
  if(to) {
      dateObj["$lte"] = new Date(to)
  }
  let filter = {
    user_id: o_id
  }
  if(from || to) {
    filter.date = dateObj
  }

  
  
  let user = await User.findById(id).exec();
  //let exercises = await Exercises.find({user_id: o_id}).exec();
  let exercises = await Exercises.find(filter).limit(+limit ?? 500).exec();

  let log = [];
  exercises.forEach((exercise) => {
    log.push({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  })
    
  
    
  res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    });

})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
