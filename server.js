var express = require('express')
  , port = process.env.OPENSHIFT_NODEJS_PORT || 8080
  , ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
  , compress = require('compression')
  , app = express()
  , http = require('http')
  , fs = require('fs')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server)
  , guest = 0
  , users = {}
  , rooms = {"Lounge": [] }
  , games = {}
  , state = {}
  ;
server.listen(port,ip);
console.log("http://localhost:3407");
app.use(compress({ threshold: 1 }));
app.use(express.static('pub'));
io.sockets.on('connection', function (socket) {
/*** Server Functions ***/
/* Create User */
  socket.on('createUser',function(){
    guest+=1;
    var user="Guest_"+guest;//generate random username
    socket.username=user;//store username in socket session for this client
    socket.room='Lounge';//store the room name in the socket session for this client
    users[user]='Lounge';//add the client's username to the global list
/* ? */
    socket.join('Lounge');//send client to Lounge
    rooms['Lounge'].push(user);//add the client's username to the room
    socket.emit('userRead',user);//send client user name
    socket.emit('chatUpdate','SERVER','you have connected to the Lounge.');//send client welcome message
    socket.broadcast.to('Lounge').emit('chatUpdate','SERVER',user+' has connected.');//send clients message
    socket.emit('roomsRead',rooms);//send client room list
    socket.emit('roomRead','Lounge');//send client current room
  });
/* Update Chat */
  socket.on('updateChat',function(msg){
		io.sockets.in(socket.room).emit('chatUpdate', socket.username, msg);
  });
/* Create Room */
  socket.on('createRoom', function (players) {
    var e=0;
    // check that the number of players is 2,3, or 4.
    switch(players) { 
      case 2:case 3:case 4:e=0;break;
      default:e=1;break;
    }
    // only create if room does not exist
    if(rooms[socket.username]) { e=1; }
    if(e==0) {
      // Make More Dry. similar to update room.
      var user = socket.username;//set client to user
      rooms[user]=new Array();//create new room
      rooms[user].push(user);//add client to room
      rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username),1); //remove user from room.
		  socket.leave(socket.room);//remove client from existing room
      users[user]=user;/* ? */
      games[user]=players;//set number of players for this game.
		  socket.join(user);//add client to new room
		  socket.emit('chatUpdate', 'SERVER', 'You have connected to '+ user);//send client welcome message
		  socket.broadcast.to(socket.room).emit('chatUpdate', 'SERVER', user+' has left this room.'); // sent message to OLD room
		  socket.room = user; // update socket session room title
		  socket.broadcast.to(user).emit('chatUpdate', 'SERVER', user+' has joined this room.');//send room welcome message
      socket.emit('roomsRead',rooms);//send client room list
      socket.emit('roomRead',user);//send client current room
      socket.broadcast.emit('roomCreate',user);//add room to everyone's list
    }
  });
/* Update Room */
  socket.on('updateRoom',function(newroom){
    //TODO: bug on update where it does not seem to set people to room
    rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username),1); //remove user from room.
    if(rooms[socket.room].length== 0 && socket.room != 'Lounge') { //if room is empty.
      delete rooms[socket.room];
      socket.broadcast.emit('roomDelete',socket.room);//remove room from everyone's list
    }else{
		  socket.broadcast.to(socket.room).emit('chatUpdate', 'SERVER', socket.username+' has left this room.');//message room about user leaving
      //TODO: cancel gamestate.update tab panes.
    }
		socket.leave(socket.room);//leave current room
    users[socket.username]=newroom;/* ? */
		socket.join(newroom);//join new room
    rooms[newroom].push(socket.username);
		socket.emit('chatUpdate', 'SERVER', 'You have connected to '+ newroom);//send message to client about joining
		socket.room = newroom;//set socket room to new room
		socket.broadcast.to(newroom).emit('chatUpdate', 'SERVER', socket.username+' has joined this room.');//message room about user joining
    socket.emit('roomsRead',rooms);//get fresh list of rooms
    socket.emit('roomRead',newroom);//get current room as acive
    //check if game state already exists.
    if (rooms[newroom].length===games[newroom]) { 
      var g=socket.room,o,i=0;
      state[g]={'c':0,'o':rooms[g],'p':new Array(),'s':{'Board':new Array(),},'d':{'d':new Array(),'r':new Array(),'p':shuffle([1,1,1,1,1,2,2,3,3,4,4,5,5,6,7,8])}};
      move(state[g]['d']['p'],state[g]['d']['r']);
      o=state[g]['o']; 
      if(o.length==2) {
        move(state[g]['d']['p'],state[g]['s']['Board']);
        move(state[g]['d']['p'],state[g]['s']['Board']);
        move(state[g]['d']['p'],state[g]['s']['Board']);
      }
      for(i;i<o.length;i++) {
        state[g][o[i]]={'h':new Array(),'t':'0'};
        state[g]['s'][o[i]]=new Array();
        move(state[g]['d']['p'],state[g][o[i]]['h']);
      }
      updateGame(g);
    }
	});
/** Draw Card Hand Update **/
  function updateGame(g) {
    //current player draw card, update hand
    //TODO check for win conditions???
    //check if all but one player is knocked out. if player has no card in their hand.
    //if player has number of tokens to win.
    var c=state[g]['c'];
    move(state[g]['d']['p'],state[g][state[g]['o'][c]]['h']);
		socket.emit('handUpdate',state[g]['s'],state[g]['o'],state[g]['o'][c]);//message user to update their hand
		socket.broadcast.to(socket.room).emit('handUpdate',state[g]['s'],state[g]['o'],state[g]['o'][c]);//message room to update their hand
  }

/* Read Hand */
  socket.on('readHand',function(){
    socket.emit('handRead',state[socket.room][socket.username]['h'],socket.username);
  });
/* Delete Card */
  socket.on('deleteCard',function(card){
    var g=state[socket.room],u=socket.username;
    console.log(g['c']);
    console.log(u);
    console.log(g['o']);
    if(g['o'][g['c']]==u) { 
      //check if user is current user
      switch(card) { //check that card is 0 or 1
        case 0:case 1:
          switch(g[u]['h'][card]) {
            case 1:
            choose();
            //choose other player, and pick number 2-8
              break;
            case 2:
            choose();
            //choose other player, display card.
              break;
            case 3:
            choose();
            //choose other player, battle with current cards.
              break;
            case 4:
            console.log(g);
            g[u]['h'].splice(card,1);
            g['s'][u].push(4);
            g['c']+=1;
            console.log(g);
            console.log('updateGame');
            updateGame(socket.room);
              break;
            case 5:
      //if all other users are last card is 4,then choose self
      //validate card7 [7]
            choose();
            //choose me or other
            //choose player, discard card. draw new card.
              break;
            case 6:
      //validate card7 [7]
            choose();
            //choose player, trade hands.
              break;
            case 7://Check other card in hand
      // check if player has 7 + ( 5 || 6 ) then delete card (7).
            //discard card.
              break;
            case 8:
            //discard card.//out of round.
              break;
          }
        //rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username),1);
        // updateGame(socket.room);
        break;
      }
    }
  });
  function choose() {
    var others = [];
    var gamestate = state[socket.room];
    for(var i=0;i<gamestate.o.length;i++) {
      if(gamestate.o[i]!=gamestate.o[gamestate.c]) {
        others.push(gamestate.o[i]);
      }
    }
    console.log(others.length);
    if(others.length > 1) {
      //socket.emit('handRead',state[socket.room][socket.username]['h'],socket.username);
      console.log('send message back to current player to pick a player, then in pick player');
      //then in pick player we resolve the action?
      //emit others to player
    }else{
    }
    console.log(others);
    //if others.length > 1  then we need tosend
    //choose playerfrom list
    //if player, shared last == 4 then ignore set flag to protect self until my next turn.
    //valid player is user with hand
    //not self,unless card5.
    //not protected
    console.log(state[socket.room]);
    //state[socket.room].c
  }
  socket.on('pickPlayer',function(player,action){
    console.log('get player');
  });

/** Disconnect **/
	socket.on('disconnect', function(){
//TODO: bug on disconnect room. removing before all people leave.
    var user=socket.username;
    rooms[socket.room].splice(rooms[socket.room].indexOf(socket.username),1);
    if(rooms[socket.room].length== 0 && socket.room != 'Lounge') { //if room is empty.
      delete rooms[socket.room];
      socket.broadcast.emit('roomDelete',socket.room);//remove room from everyone's list
    }
		delete users[socket.username]; // remove the username from global users list
		socket.broadcast.emit('chatUpdate', 'SERVER', socket.username + ' has disconnected');//message everyone
		socket.leave(socket.room);//leave current room
	});
/* */
  function move(src,dest) {
    dest.push(src.pop())
  }
/* */
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
});
