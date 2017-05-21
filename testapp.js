var express = require('express');
var app = require('express')();
var http = require('http').Server(app);

var io = require('socket.io')(http);

app.use(function(req, res, next) {
        res.setHeader("X-UA-Compatible", "chrome=1");
        return next();
    });
app.use(express.static(__dirname + '/public_login_scroll'));

/*
app.get('/', function(req, res){
  console.log(req.signedCookies['lhc_client0']);
  console.log(req.cookies);
  res.cookie('lhc_client0' , 'lhc_client_cookie val0',{path : '/chat', expires : new Date(Date.now()+3000000),signed: true});
  res.cookie('lhc_client1' , 'lhc_client_cookie val1',{path : '/chat', expires : new Date(Date.now()+3000000),signed: true });
  res.sendfile('index.html');
});

app.get('/cookie' , function(req , res){
  console.log(req.cookies);
  console.log('aaaaaaaaaaa');
  console.log(req.signedCookies['lhc_client0']);
  //console.log(signedCookies['lhc_client0']);
  res.sendfile('index1.html');

});

app.get('/chat', function(req, res){
  
  res.sendfile('chat.html');
}); */


io.on('connection', function(socket) {
    console.log('connected');
    socket.on('CreateSession', function(msg){
        socket.join(msg);
        console.log('Create session...................');
    });
    socket.on('PageChange', function(msg){
        socket.join(msg);
        io.sockets.in(msg).emit('SessionStarted', '');
        console.log('PageChange');
    });
    socket.on('JoinRoom', function(msg){
        socket.join(msg);
        io.sockets.in(msg).emit('SessionStarted', '');
    });
    socket.on('ClientMousePosition', function(msg){
        //console.log('ClientMousePosition');
        //socket.emit('ClientMousePosition', {PositionLeft:msg.PositionLeft, PositionTop:msg.PositionTop});
        socket.broadcast.to(msg.room).emit('ClientMousePosition', {PositionLeft:msg.PositionLeft, PositionTop:msg.PositionTop});
    });
    socket.on('AdminMousePosition', function(msg){
        console.log('AdminMousePosition');
        socket.broadcast.to(msg.room).emit('AdminMousePosition', {PositionLeft:msg.PositionLeft, PositionTop:msg.PositionTop});
    });
    socket.on('changeHappened', function(msg){
        console.log('changeHappened');
        socket.broadcast.to(msg.room).emit('changes', msg.change);
    });
    socket.on('DOMLoaded', function(msg){
        socket.broadcast.to(msg.room).emit('DOMLoaded', '');
    });
});

http.listen(3000,'192.168.1.5', function(){
  console.log('listening on *:3000');
}); 