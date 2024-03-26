function getMovieId() {
  let url = window.location.href;
  let id = url.substring(url.lastIndexOf("=") + 1);
  return id;
}
function getMovieData(callback) {
  let id = getMovieId();
  axios
    .get("/api/v1/movie/" + id)
    .then(function (response) {
      callback(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}
function convertDate(date) {
  //convert date to english format
  let months = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };
  let numberToEnglish = {
    1: "First",
    2: "Second",
    3: "Third",
    4: "Fourth",
    5: "Fifth",
    6: "Sixth",
    7: "Seventh",
    8: "Eighth",
    9: "Ninth",
    10: "Tenth",
    11: "Eleventh",
    12: "Twelfth",
    13: "Thirteenth",
    14: "Fourteenth",
    15: "Fifteenth",
    16: "Sixteenth",
    17: "Seventeenth",
    18: "Eighteenth",
    19: "Nineteenth",
    20: "Twentieth",
    21: "Twenty first",
    22: "Twenty second",
    23: "Twenty third",
    24: "Twenty fourth",
    25: "Twenty fifth",
    26: "Twenty sixth",
    27: "Twenty seventh",
    28: "Twenty eighth",
    29: "Twenty ninth",
    30: "Thirtieth",
    31: "Thirty first",
  };
  let month = date.split("/")[0];
  let day = date.split("/")[1];

  return numberToEnglish[day] + " " + months[month];
}
function convertTime(time) {
  //convert time to english format
  let hours = time.split(":")[0];
  let minutes = time.split(":")[1];
  let ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  let strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
}
function convertToScreen(youtubeurl) {
  if (youtubeurl) {
    //convert youtube url to embed url
    let videoId = youtubeurl.split("v=")[1];
    let ampersandPosition = videoId.indexOf("&");
    if (ampersandPosition != -1) {
      videoId = videoId.substring(0, ampersandPosition);
    }
    return (
      "https://www.youtube.com/embed/" +
      videoId +
      "?autoplay=1&mute=1&controls=0&loop=1"
    );
  } else {
    return "";
  }
}
document.addEventListener("DOMContentLoaded", function (event) {

  getMovieData(function (data) {
    if(data.playing){
    document.title = "Movie - " + data.name;
    document.getElementById("title").innerHTML = data.name;
    document.getElementById("description").innerHTML = data.description;
    document.getElementById("rating").innerHTML = data.rating;
    document.getElementById("duration").innerHTML =
      "Duration: " + data.duration;
    document.getElementById("genre").innerHTML = "Genre: " + data.genre;
    document.getElementById("releaseDate").innerHTML =
      "Release On: " + data.releaseDate;
    document.getElementById("movie").src = data.image;
    document.getElementById("director").innerHTML = `Directed by: ${
      data.director ? data.director : "Unknown Director"
    }`;
    let times = document.getElementById("time");
    let dates = document.getElementById("date");
    data.showings.forEach((showing) => {
      let time = document.createElement("option");
      time.value = showing.time;
      time.innerHTML = convertTime(showing.time);
      times.appendChild(time);
      let date = document.createElement("option");
      date.value = showing.date;
      date.innerHTML = convertDate(showing.date);
      dates.appendChild(date);
    });
    document.getElementById("video").data =
      convertToScreen(data.trailer) ||
      "https://youtube.com/embed/8Qn_spdM5Zg?autoplay=1&fs=1&iv_load_policy=3&showinfo=0&rel=0&cc_load_policy=0&start=1&end=0&vq=hd1080&origin=https://youtubeembedcode.com&widgetid=1&mute=1&controls=0&loop=1";
    }
    else{
      window.location.href = "/404";
    }
  });
});
const seatsContainer = document.getElementById("theater");
const seats = document.querySelectorAll(".row .seat:not(.occupied)");
const count = document.getElementById("seatsSelected");
const total = document.getElementById("totalPrice");
let ticketPrice = 6;
document.getElementById("ticket-price").innerHTML = "$" + ticketPrice;
function updateSelectedCount() {
  const selectedSeats = document.querySelectorAll(".seats .seat.selected");
  const seatsIndex = [...selectedSeats].map((seat) => [...seats].indexOf(seat));
  const selectedSeatsCount = selectedSeats.length;
  count.innerText = "Seats Selected: " + selectedSeatsCount;
  total.innerText = "Total Price: $" + selectedSeatsCount * ticketPrice;
}
seatsContainer.addEventListener("click", (e) => {
  if ($(e.target).hasClass("seat") && !$(e.target).hasClass("occupied")) {
    $(e.target).toggleClass("selected");
    updateSelectedCount();
  }
});
function getSelectedSeatsId() {
  let selectedSeats = document.querySelectorAll(".seat.selected");
  let seatsId = [];
  selectedSeats.forEach((seat) => {
    seatsId.push(seat.id);
  });
  //remove 0 from the array
  seatsId = seatsId.filter((seat) => seat != 0);
  return seatsId;
}
function createUserId() {
  if (localStorage.getItem("userId") == null) {
    let userId = Math.floor(Math.random() * 1000000000);
    localStorage.setItem("userId", userId);
    return userId;
  } else {
    return localStorage.getItem("userId");
  }
}
function bookMovie(paypaldetails) {
  const data = {
    movieId: getMovieId(),
    userId: createUserId(),
    seats: getSelectedSeatsId(),
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    price: ticketPrice,
    orderDetails: paypaldetails,
  };
  if (data.seats.length == 0) {
    alert("Please select seats");
  } else {
    fetch("/api/v1/bookings/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status == "success") {

          window.location.href =
            "/bookings?bookId=" +
            data.results.id +
            "&movieId=" +
            data.results.movieId;
          
        } else {
          alert("Booking Failed");
        }
      });
  }
}
function setSeats() {
  //get bookings for date and time and check for seats that are already booked
  let movieId = getMovieId();
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;
  let seats = document.querySelectorAll(".seats .seat");
  seats.forEach((seat) => {
    seat.classList.remove("occupied");
  });

  fetch("/api/v1/bookings/" + movieId, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      let bookedSeats = data;
      bookedSeats.forEach((booking) => {
        if (booking.date == date && booking.time == time) {
          booking.seats.forEach((seat) => {
            document.getElementById(seat).classList.add("occupied");
          });
        }
      });
    });
}
document.getElementById("date").addEventListener("change", () => {
  setSeats();
});
document.getElementById("time").addEventListener("change", () => {
  setSeats();
});

//paypal
paypal
  .Buttons({
    createOrder: function (data, actions) {
      // This function sets up the details of the transaction, including the amount and line item details.
      return actions.order.create({
        purchase_units: [
          {
            amount: {
              value: total.innerText.split("$")[1],
            },
          },
        ],
      });
    },
    onApprove: function (data, actions) {
      // This function captures the funds from the transaction.
      return actions.order.capture().then(function (details) {
        bookMovie(details);
      });
    },
  })
  .render("#paypal-button-container"); // Display payment options on your web page

  function toggleNavbar(collapseID) {
    document.getElementById(collapseID).classList.toggle("hidden");
    document.getElementById(collapseID).classList.toggle("block");
    const icon = document.getElementById('nav-icon');
    if (icon.classList.contains('fa-bars')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}
