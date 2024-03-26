const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const randomUUID = require("uuid-random");
const app = express();
const port = 3000;
const md5 = require("md5");
const multer = require("multer");
const admin = require("./admin.json");
const path = require("path");
const QRCode = require("qrcode");
const paypal = require("paypal-rest-sdk");
const dotenv = require("dotenv");
const corsAnywhere = require("cors-anywhere");
corsAnywhere.createServer().listen(3001, "localhost", () => {
  console.log("Running CORS Anywhere on localhost:3001");
});
dotenv.config();
paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
//redirect any html files to with the same name as the route
app.get("/:name", (req, res) => {
  //if the file exists, send it
  if (fs.existsSync(`./public/${req.params.name}.html`)) {
    res.sendFile(path.join(__dirname, `/public/${req.params.name}.html`));
  } else {
    //else send the 404 page
    res.sendFile(path.join(__dirname, `/public/404.html`));
  }
});
app.listen(port, () => console.log(`Listening on port ${port}`));
//api v1
function createShowings() {
  let showings = [];
  let dates = [];
  let times = [];
  let date = new Date();
  for (let i = 0; i < 5; i++) {
    const day = date.getDate() + Math.floor(Math.random() * 10);
    const month = date.getMonth() + 1;
    let newDate = `${month}/${day}`;
    let newTime =
      Math.floor(Math.random() * 20) + 8 + ":" + Math.floor(Math.random() * 60);
    dates.push(newDate);
    times.push(newTime);
  }
  for (let i = 0; i < 5; i++) {
    //round the time to the nearest 15 minutes
    let time = times[i];
    let hour = time.split(":")[0];
    let minutes = time.split(":")[1];
    if (minutes < 15) {
      minutes = "00";
    }
    if (minutes >= 15 && minutes < 30) {
      minutes = "15";
    }
    if (minutes >= 30 && minutes < 45) {
      minutes = "30";
    }
    if (minutes >= 45) {
      minutes = "45";
    }
    let newTime = `${hour}:${minutes}`;
    let showing = {
      date: dates[i],
      time: newTime,
    };
    showings.push(showing);
  }
  return showings;
}
function getKey(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).send("Unauthorized request");
  }
  let key = req.headers.authorization.split(" ")[1];
  if (key == admin[0].key) {
    next();
  } else {
    return res.status(401).send("Unauthorized request");
  }
}
//movies
app.get("/api/v1/movies", (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    res.send(movies);
  });
});
app.get("/api/v1/movies/playing", (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let playing = movies.filter((movie) => movie.playing === true);
    res.json({
      results: playing,
      message: "Movie playing successfully",
      status: "success",
    });
  });
});
app.get("/api/v1/movie/:id", (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let movie = movies.find((movie) => movie.id === req.params.id);
    if (movie) {
      res.send(movie);
    }
    //else send a 404
    else {
      res.json({
        results: null,
        message: "Movie not found",
        status: "error",
      });
    }
  });
});

app.get("/api/v1/movies/new", (req, res) => {
  //movies that have been out for less than 2 weeks and are playing
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let newMovies = movies.filter(
      (movie) =>
        movie.playing == true &&
        new Date(movie.releaseDate) > new Date(Date.now() - 12096e5)
    );
    res.json({
      results: newMovies,
      message: "New movies successfully",
      status: "success",
    });
  });
});
app.get("/api/v1/movies/soon", (req, res) => {
  //movies coming out in less than a month and are not playing and also are not from the past
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let soonMovies = movies.filter(
      (movie) =>
        movie.playing == false &&
        new Date(movie.releaseDate) > new Date(Date.now()) &&
        new Date(movie.releaseDate) < new Date(Date.now() + 2592e6)
    );
    res.json({
      results: soonMovies,
      message: "Soon movies successfully",
      status: "success",
    });
  });
});

//bookings post
app.post("/api/v1/bookings", (req, res) => {
  fs.readFile("bookings.json", "utf8", (err, data) => {
    if (err) throw err;
    let bookings = JSON.parse(data);
    let booking = {
      id: randomUUID(),
      movieId: req.body.movieId,
      date: req.body.date,
      time: req.body.time,
      seats: req.body.seats,
      userId: req.body.userId,
      price: req.body.price,
      orderDetails: req.body.orderDetails,
    };

    if (
      booking.movieId &&
      booking.date &&
      booking.time &&
      booking.seats &&
      booking.userId
    ) {
      bookings.push(booking);
      fs.writeFile("bookings.json", JSON.stringify(bookings), (err) => {
        if (err) throw err;
        console.log("Booking saved");
        res.json({
          
          results: booking,
          message: "Booking successfully",
          status: "success",
        });
      });
    } else {
      res.json({
        message: "Booking failed",
        status: "failed",
      });
    }
  });
});

app.get("/api/v1/qrcode/:id", (req, res) => {
  const qr = QRCode.toDataURL(req.params.id, (err, url) => {
    res.send(url);
  });
});
//bookings
app.get("/api/v1/booking/:movieId/:bookId", (req, res) => {
  fs.readFile("bookings.json", (err, data) => {
    if (err) throw err;
    let bookings = JSON.parse(data);
    let booking = bookings.find(
      (booking) =>
        booking.id === req.params.bookId &&
        booking.movieId === req.params.movieId
    );
    console.log(booking);
    res.send(booking);
  });
});
app.get("/api/v1/bookings/:movieId/", (req, res) => {
  fs.readFile("bookings.json", (err, data) => {
    if (err) throw err;
    let bookings = JSON.parse(data);
    let booking = bookings.filter(
      (booking) => booking.movieId === req.params.movieId
    );
    res.send(booking);
  });
});
//users bookings
app.get("/api/v1/users/:userId/bookings", (req, res) => {
  fs.readFile("bookings.json", "utf8", (err, data) => {
    if (err) throw err;
    let bookings = JSON.parse(data);
    let userBookings = bookings.filter(
      (booking) => booking.userId === req.params.userId
    );
    res.json({
      results: userBookings,
      message: "User bookings successfully",
      status: "success",
    });
  });
});
//admin
app.get("/api/v1/admin/quickstats", getKey, (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    fs.readFile("users.json", (err, data) => {
      if (err) throw err;
      let users = JSON.parse(data);
      let quickStats = {
        movies: movies.length,
        users: users.length,
      };
      res.json({
        stats: quickStats,
        status: "success",
      });
    });
  });
});
app.post("/api/v1/admin/movies", getKey, (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let movie = {
      id: randomUUID(),
      name: req.body.name,
      image: req.body.image,
      description: req.body.description,
      overview: req.body.overview,
      releaseDate: req.body.releaseDate,
      playing: false,
      rating: req.body.rating,
      genre: req.body.genre,
      duration: req.body.duration,
      director: req.body.director,
      showings: createShowings(),
      trailer: req.body.trailer,
    };
    movies.push(movie);
    fs.writeFile("data.json", JSON.stringify(movies), (err) => {
      if (err) throw err;
      res.json({
        movie: movie,
        status: "success",
      });
    });
  });
});
app.put("/api/v1/admin/movies/:id", getKey, (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let movie = movies.find((movie) => movie.id === req.params.id);
    movie.name = req.body.name;
    movie.image = req.body.image;
    movie.description = req.body.description;
    movie.releaseDate = req.body.releaseDate;
    movie.playing = req.body.playing;
    movie.genre = req.body.genre;
    fs.writeFile("data.json", JSON.stringify(movies), (err) => {
      if (err) throw err;
      res.send(movie);
    });
  });
});
app.delete("/api/v1/admin/movies/:id", getKey, (req, res) => {
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let movie = movies.find((movie) => movie.id === req.params.id);
    movies.splice(movies.indexOf(movie), 1);
    fs.writeFile("data.json", JSON.stringify(movies), (err) => {
      if (err) throw err;
      res.send(movie);
    });
  });
});
app.post("/api/v1/admin/movies/:id/play", getKey, (req, res) => {
  var playing = req.body.playing;
  fs.readFile("data.json", (err, data) => {
    if (err) throw err;
    let movies = JSON.parse(data);
    let movie = movies.find((movie) => movie.id === req.params.id);
    movie.showings = createShowings();
    if (playing === true) {
      movie.playing = true;
    } else {
      movie.playing = false;
    }
    fs.writeFile("data.json", JSON.stringify(movies), (err) => {
      if (err) throw err;
      res.send(movie);
    });
  });
});
//login admin
app.post("/api/v1/admin/login", (req, res) => {
  fs.readFile("admin.json", (err, data) => {
    if (err) throw err;
    let admin = JSON.parse(data);
    let user = admin.find(
      (user) =>
        user.email === req.body.email &&
        user.password === md5(req.body.password)
    );
    if (user) {
      res.json({
        key: user.key,
        message: "Login successful",
        status: "success",
      });
    } else {
      res.json({
        key: null,
        message: "Invalid credentials",
        status: "error",
      });
    }
  });
});
const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|jfif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage, fileFilter: imageFilter });
app.post(
  "/api/v1/admin/upload-image",
  getKey,
  upload.single("image"),
  (req, res) => {
    res.json({
      status: "success",
      message: "Image uploaded successfully",
      image: "/images/" + req.file.filename,
    });
  }
);
app.get("/api/v1/admin/validation/:key", (req, res) => {
  fs.readFile("admin.json", (err, data) => {
    if (err) throw err;
    let admin = JSON.parse(data);
    let user = admin.find((user) => user.key === req.params.key);
    if (user) {
      res.json({
        message: "Valid key",
        status: "success",
      });
    } else {
      res.json({
        message: "Invalid key",
        status: "error",
      });
    }
  });
});
app.get("/api/v1/admin/checkBooking/:id", getKey, (req, res) => {
  fs.readFile("bookings.json", (err, data) => {
    if (err) throw err;
    let booking = JSON.parse(data);
    let bookingData = booking.find((booking) => booking.id === req.params.id);
    if (bookingData) {
      res.json({
        message: "Valid booking",
        status: "success",
        data: bookingData,
      });
    } else {
      res.json({
        message: "Invalid booking",
        status: "error",
      });
    }
  });
});
//redirects
app.get("/admin/home", (req, res) => {
  res.redirect("/admin/dashboard.html");
});
app.get("/admin/:page", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin", req.params.page + ".html"));
});
app.get("/movies/:id", (req, res) => {
  res.redirect("/movie?id=" + req.params.id);
});
