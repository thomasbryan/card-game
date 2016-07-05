/*** Connect Server ***/
var socket = io.connect('/');
/*** Keyboard Shortcuts ***/
$(document).keydown(function(e) { 
  switch(e.which) {
    case 37: left(); break;/* Left */
    case 38: if($('.rooms li').size()>1){ if($('.rooms li.active').prev().text() == '') { socket.emit('updateRoom',$('.rooms li').last().text()); }else{ socket.emit('updateRoom',$('.rooms li.active').prev().text()); } } break;/* Up */
    case 39: right(); break;/* Right */
    case 40: if($('.rooms li').size()>1){ if($('.rooms li.active').next().text() == '') { socket.emit('updateRoom',$('.rooms li').first().text()); } else{ socket.emit('updateRoom',$('.rooms li.active').next().text()); } } break;/* Down */
    case 50: socket.emit('createRoom',2);break;/* 2 */
    case 51: socket.emit('createRoom',3);break;/* 3 */
    case 52: socket.emit('createRoom',4);break;/* 4 */
  }
});
/*** Variables ***/
var cards={'1':'card1','2':'card2','3':'card3','4':'card4','5':'card5','6':'card6','7':'card7','8':'card8'};
/*** Server Functions ***/
/* Create User */
socket.on('connect',function(){
  socket.emit('createUser');
});
/* Update Chat */
$(document).on("keypress", ".updateChat",function(e){
  if(e.which == 13) {
    var msg = $('.updateChat').val();
    $('.updateChat').val('');
    //$('.updateChat').blur();
    socket.emit('updateChat', msg);
  }
});
/* Create Room */
$(document).on("click touchstart", ".createRoom",function(){
  socket.emit('createRoom',$(this).data("id"));
});
/* Update Room */
$(document).on("click touchstart", ".updateRoom",function(){
  socket.emit('updateRoom',$(this).text());
});
/* Read Hand */
$(document).on("click touchstart", ".readHand",function(){
  //socket.emit('readHand');
});
/* Delete Card */
$(document).on("click touchstart", ".deleteCard",function(){
  socket.emit('deleteCard',$(this).data('id'));
});
/*** Client Functions ***/
/* Read User */
socket.on('userRead',function(user){
  $(".user").text(user);
});
/* Update Chat */
socket.on('chatUpdate',function(user,msg){
  $(".chat").scrollTop($(".chat")[0].scrollHeight);
  $('.chat').append('<b>'+user+':</b> '+msg+'<br>');
  $('.chat br:last-child').show('slow', function() {
    $(".chat").scrollTop($(".chat")[0].scrollHeight);
  });
});
/* Read Rooms */
socket.on('roomsRead', function(rooms) {
  $('.rooms').empty();
  $.each(rooms, function(key, val) {
    $('.rooms').append('<li class="'+key+'"><a href="javascript:void(0);" class="updateRoom" >'+key+'</a></li>');
  }); 
});
/* Read Room */
socket.on('roomRead',function(room) {
  $('.rooms').removeClass('active');
  $('.'+room).html('<a href="javascript:void(0);">'+room+'</a>');
  $('.'+room).addClass('active');
  $('.room').html('Room: '+room);
});
/* Create Room */
socket.on('roomCreate',function(room) {
  $('.rooms').append('<li class="'+room+'"><a href="javascript:void(0);" class="updateRoom">'+room+'</a></li>');
});
/* Delete Room */
socket.on('roomDelete',function(room) {
  //remove hand/
  $('.rooms .'+room).remove();
  //remove tabs?
  $('#tab a[href=#chat]').tab('show');
  $('#tab li:not(.active)').remove();
  $('.tab-content .tab-pane:not(.active)').remove();
});
/* Read Hand */
socket.on('handRead',function(hand,user) {
  $('#'+user+' .hand').html('');
  $('.'+user).addClass('self');
  $.each(hand, function(id,type){
    $('#'+user+' .hand').append('<a href="javascript:void(0);" class="deleteCard" data-id="'+id+'"><div class="col-sm-3 card '+cards[type]+'"></div></a>');
  });
});
/* Update Hand */
socket.on('handUpdate',function(pool,order,current) {
  if(pool['Board'].length!=0) {
    if(!$('#Board').length){
      $('#tab').append('<li><a href="#Board" data-toggle="tab">Board</a></li>');
      $('.tab-content').append('<div class="tab-pane" id="Board"><div class="hand"></div><div class="discarded"></div></div>');
    }
  }
  $.each(order, function(id,player) {
    if(!$('#'+player).length) {
      $('#tab').append('<li class="'+player+'"><a href="#'+player+'" data-toggle="tab">'+player+'</a></li>');
      $('.tab-content').append('<div class="tab-pane" id="'+player+'"><div class="hand"><div class="col-sm-3 card"</div></div><div class="discarded"></div></div>');
    }
  });
  $.each(pool, function(player, card) {
    $('#'+player+' .discarded').html('');
    if(card.length!=0) {
      $.each(card, function(id,type){
        $('#'+player+' .discarded').append('<div class="col-sm-3 card discard '+cards[type]+'" data-id="'+id+'"></div>');
      });
    }
  }); 
  $('#tab li').removeClass('current');
  $('.'+current).addClass('current');
  $('#'+current+' .hand').append('<div class="col-sm-3 card"></div>');
  socket.emit('readHand');
});
/* Delete Hand */
socket.on('handDelete',function() {
  //#tab li not 'Chat' > delete
  //remove panes not chat
});
/* Read Card */
socket.on('cardRead',function(card) {
  console.log(card);
});
/* Delete Card */
socket.on('cardDelete',function(card) {
  console.log(card);
});
/* Left Key */
function left() {
  if($('#tab li').size()>1) { 
    if($('#tab li.active').prev().text()=='') { 
      $('#tab a:last').tab('show'); 
    }else{ 
      var prev=$('#tab li.active').index(); 
      prev-=1; 
      $('#tab li:eq('+ prev+') a').tab('show'); 
    } 
    $('.tab').text($('#tab .active').text());
  } 
}
/* Right Key */
function right() {
  if($('#tab li').size()>1) { 
    if($('#tab li.active').next().text()=='') { 
      $('#tab a:first').tab('show'); 
    }else{ 
      var next=$('#tab li.active').index(); 
      next+=1; 
      $('#tab li:eq('+ next+') a').tab('show'); 
    } 
    $('.tab').text($('#tab .active').text());
  } 
}
