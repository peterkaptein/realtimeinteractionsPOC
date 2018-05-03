

var express = require('express');
var bodyParser = require('body-parser');

var config = require('./config.js');

var webSocketTest= require('./src/examples/SocketServer');

let socketServer=new webSocketTest.SocketServerSample();

app = express();


app.use(bodyParser());

console.log("Server started at port : "+config.server.port)


app.use("/css",express.static('./css'));
app.use("/", express.static('./site'));


app.get("/", function(req, res) {
	res.redirect('/index.html');
});

// Start the server
app.listen(config.server.port);
