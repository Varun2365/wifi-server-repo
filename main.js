const express = require("express")
require('dotenv').config()
const mongoose = require("mongoose")
const DeviceSchema = require("./device-id-schema")
const UserSchema = require("./users-schema")
const userSchema = require("./users-schema")
const deviceInfoSchema = require("./device-info-schema")
const os = require("os");
const PORT = 8000

const app = express();

//Listening the server
app.listen(PORT, () => {
  console.log(`Server Started At Port : ${PORT}`)
})
//Connecting the MongoDB Server
const db = mongoose.connect('mongodb+srv://Varun:Varun9999@wifi-server.kvwhr.mongodb.net/?retryWrites=true&w=majority&appName=Wifi-Server/Wifi-Module', {
  
  dbName: 'Wifi-Module' // Ensure this is set.
})
.then(() => console.log('Connected to wifi-module database'))
.catch(err => console.error('Connection error:', err));
// const db = mongoose.connect('mongodb://localhost:27017', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   dbName: 'Wifi-Module' // Ensure this is set.
// })
// .then(() => console.log('Connected to wifi-module database'))
// .catch(err => console.error('Connection error:', err));
const Users = mongoose.model("Users", UserSchema, "Users")


//Applying API Routes
//Home route end point for the URL
app.get("/", (req, res) => {
  res.send("Home Page End Point")
});

app.get("/users", async (req, res) => {

});

app.get("/data", async (req, res) => {
  const deviceName = req.query.device.toString();
  var queryDate = new Date(req.query.date.split("-").reverse().join("-").toString());
  var nextDate = getNextDay(queryDate);
  var responseJSON = {
  };

  try {
    const collectionExists = await mongoose.connection.db.listCollections({ name: deviceName }).toArray();
    if (collectionExists.length === 0) {
      responseJSON.status = 400;
      responseJSON.dataAvailable = false;
      responseJSON.message = "Cannot Find Device"

      return res.send(responseJSON);
    }


    const currentDevice = mongoose.model(deviceName, DeviceSchema, deviceName);
    var data = await currentDevice.find({ dateTime: { $gte: queryDate, $lt: nextDate } }, { _id: 0, __v: 0 }).lean();
    responseJSON.data = data;
    responseJSON.dataAvailable = data.length == 0 ? false : true;
    responseJSON.message = data.length == 0 ? "No data found for the selected date." : "Data Found"
    console.log("Data fetched:", responseJSON);
    res.send(responseJSON);

  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).send("Error fetching data");
  }

})


app.post("/upload", (req, res) => {
  console.log(req.headers)
  if (req.headers.time != "." && !req.headers.date.startsWith("??")) {
    try {

      saveInfo(req.headers)
    }
    catch (e) {
      console.log("Unable To Save Info")
    }
  }
  else {
    console.log("Entry Wasn't Saved!")
  }
})
app.get("/upload", (req, res) => {

  console.log(req.query);
  if (req.query.time != "." && !req.query.date.startsWith("??") && req.query.time.length != 0 && req.query.date.length != 0) {
    try {

      saveInfo(req.query)
    }
    catch (e) {
      console.log("Unable To Save Info" + e.message)
    }
  }
  else {
    console.log("Entry Wasn't Saved!")
  }
  res.send("Data Uploaded")
})


app.get('/users/signup', async (req, res) => {
  var params = req.query;
  const userModel = mongoose.model('Users', userSchema, 'Users');
  try {

    const user = await userModel.findOne({ email: params.email });

    if (user === null) {
      userModel.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        companyName: params.cName,
        password: params.password,
      })
      res.send({
        message: "Account Created Successfully",
        validResponse: true,
      })
    } else {
      res.send({
        message: "Account Already Exists",
        validResponse: false
      });
    }
  } catch (error) {
    console.error("Error checking email:", error);
  }

})

app.get('/users/login', async (req, res) => {
  const params = req.query
  const User = mongoose.model("Users", userSchema, "Users");
  const user = await User.findOne({ email: params.email });
  console.log(user)
  if (user == null) {
    res.send({
      validResponse: false,
      message: "User Doesn't Exist",
    })
  } else {
    if (params.password == user.password) {
      res.send({
        validResponse: true,
        message: "Logged In Successfully",
        data: user.devices
      })
    }
    else {


      res.send({
        validResponse: false,
        message: "Incorrect password"
      })
    }
  }
})

app.get('/users/data', async (req, res) => {
  const params = req.query;


  // Handling : To check if the user exists
  if (params.action == "emailExist") {
    console.log("Email Exists : QUERY")
    try {
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({ email: params.email });

      if (user === null) {
        res.send({
          message: "Account Can Be Created",
          validResponse: true
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
    }
  }


  // Handling : To add a new device to a user device Array.
  if (params.action == "addDevice") {
    var deviceI = params.di;
    var password = params.dp;
    var userId = params.ui;
    var companyName = params.cn;
    var alias = params.al;
    var location = params.lc;
    console.log(deviceI + password+userId);
    try {
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({ email: userId });
      const DeviceInfo = mongoose.model("Device-Info", deviceInfoSchema, "Device-Info");
      const cDevice = await DeviceInfo.findOne({ deviceId: deviceI })

      if (user == null || cDevice == null) {
        res.send({
          validResponse: false,
          message: "Credentials Not Found",
        })
      } else {
        console.log(`${cDevice.pass} ===== ${password}`)
        if (cDevice.pass === password) {
           // Replace with proper password comparison

           const availableDevices = await User.find({}, 'devices.name');

           if (true) { // Prevent duplicate devices (replace with actual check)
            const deviceExists = user.devices.some(device => device.name === params.di);
        
            if (!deviceExists) {
                user.devices.push({
                    name: params.di,
                    companyName: companyName,
                    alias: alias,
                    location: location,
                });
                await user.save(); // Don't forget to save!
                if (!cDevice.owners.includes(userId)) {
                    cDevice.owners.push(userId);
                    await cDevice.save(); // save the cDevice as well.
                }
                return res.send({
                    validResponse: true,
                    message: "Device Added Successfully",
                });
            } else {
                return res.send({
                    validResponse: false,
                    message: "Device already added",
                });
            }
        }
        } else {
          res.send({
            validResponse: false,
            message: "Incorrect Password"
          })
        }
      }
    } catch (e) {
      console.log(e.message)
    }
  }




  // Sending Data for Home Screen
  if(params.action == "getInfo"){
    console.log("Get Info Called")
    var emailId = params.ui;
    try{
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({email : emailId});

      if(user == null){
        console.log("Sending IF")
        res.send({
          validResponse : false,
          message : 'No User Found',
          data : []
        });
      }else{
        console.log("Sending Else")
        res.send({
          validResponse : true,
          message : "Data Retrived",
          data : {
            name : user.name,
            devices : user.devices
          }
        })
      }
    }catch(e){

    }
  }
});

app.get('/createDevice',(req,res)=>{
  var params = req.query;
  const device_info = mongoose.model('Device-Info', deviceInfoSchema, 'Device-Info');
  try{device_info.create({
    deviceId : params.di,
    pass : params.pass,
    owners : []
  })
  res.send("Created")}catch(e){
    res.send(e.message);
  }
})
function saveInfo(data) {
  try {
    const currentDevice = mongoose.model(data.deviceid, DeviceSchema, data.deviceid);
    const rDate = data.date;
    const rTime = data.time;

    const dateParts = rDate.split("/");
    const timeParts = rTime.split(":"); // Assuming rTime will be like "9:00" or "09:00"

    let day, month, year, hours, minutes, seconds;

    if (dateParts.length === 3) {
      [day, month, year] = dateParts.map(Number);
    } else {
      console.error(`Invalid date format: ${rDate}. Skipping save.`);
      return;
    }

    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0; // Default seconds to 0 if not provided
    } else {
      console.warn(`Invalid time format: ${rTime}. Setting time to 00:00:00.`);
      hours = 0;
      minutes = 0;
      seconds = 0;
    }

    // Basic validation for date and 12-hour time components
    if (
      isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
      month < 1 || month > 12 ||
      day < 1 || day > new Date(year, month, 0).getDate() ||
      hours < 1 || hours > 12 || // Incoming time is 1-12
      minutes < 0 || minutes > 59 ||
      seconds < 0 || seconds > 59
    ) {
      console.error(`Invalid date or 12-hour time components: Date=${rDate}, Time=${rTime}. Skipping save.`);
      return;
    }

    // Get the current Indian time to determine AM/PM
    const nowInIndia = new Date();
    const currentHourInIndia = nowInIndia.getHours(); // 0-23

    // Adjust the incoming hour to 24-hour format based on current Indian time
    let adjustedHours = hours;
    if (currentHourInIndia >= 12 && currentHourInIndia < 24 && hours !== 12) {
      adjustedHours += 12;
    } else if (currentHourInIndia < 12 && hours === 12) {
      adjustedHours = 0; // Midnight case
    }

    let dateTimeObject = new Date(year, month - 1, day, adjustedHours, minutes, seconds);

    // Check if the created Date object is valid
    if (isNaN(dateTimeObject.getTime())) {
      console.error(`Could not create a valid Date object from: Date=${rDate}, Time=${rTime} (adjusted to ${adjustedHours}:${minutes}:${seconds}). Skipping save.`);
      return;
    }

    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istDateTimeObject = new Date(dateTimeObject.getTime() + IST_OFFSET);

    // Format the time in AM/PM for storage (optional, but good for display)
    let ampmHours = hours;
    const ampm = currentHourInIndia >= 12 ? 'PM' : 'AM';
    ampmHours = ampmHours % 12;
    ampmHours = ampmHours ? ampmHours : 12;
    const ampmMinutes = minutes.toString().padStart(2, '0');
    const ampmSeconds = seconds.toString().padStart(2, '0');
    const formattedTimeAMPM = `${ampmHours}:${ampmMinutes}:${ampmSeconds} ${ampm}`;

    currentDevice.create({
      weight: data.weight,
      sno: parseInt(data['s.no.']),
      dateTime: istDateTimeObject, // Store the calculated 24-hour format in IST
      timeAMPM: formattedTimeAMPM // Store the AM/PM format (based on the assumption)
    });

  } catch (error) {
    console.error("Error in saveInfo function:", error.message);
  }
}

function getNextDay(date) {
  try {
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    return nextDate;
  } catch (error) {
    console.error("Error in getNextDay function:", error.message);
    return null; // Or some other appropriate error indicator
  }
}


function getNextDay(date) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + 1);
  return nextDate;
}
