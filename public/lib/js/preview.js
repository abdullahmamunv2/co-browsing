var socket = io('http://localhost:3000');
var SessionKey;
var element;
var mirror;

function scrollable(element) {
    var vertically_scrollable, horizontally_scrollable;

    var e = $(element);

     if (   e.css('overflow') == 'scroll' 
         || e.css('overflow') == 'auto'
         || e.css('overflowY') == 'scroll'
         || e.css('overflowY') == 'auto'
         || e.css('height') != 'none'
         || e.css('max-height') != 'none'                          
         ) {
         return true;
    } else {
        return false;
    }
}


function SendMouse(){
    document.onmousemove = function(e) {
        if(!e) e = window.event;

        if(e.pageX == null && e.clientX != null) {
            var doc = document.documentElement, body = document.body;

            e.pageX = e.clientX
                + (doc && doc.scrollLeft || body && body.scrollLeft || 0)
                - (doc.clientLeft || 0);

            e.pageY = e.clientY
                + (doc && doc.scrollTop || body && body.scrollTop || 0)
                - (doc.clientTop || 0);
        }
        socket.emit('AdminMousePosition', {PositionLeft: e.pageX, PositionTop: e.pageY - 15, room: SessionKey});
    }
}



socket.on('connect', function(){
    //console.log('connected to server');
    //socket.emit('test' ,'');
});

socket.on('disconnect', function(){
//Your Code Here
    console.log('disconnected........');
});

socket.on('SessionStarted', function() {
    console.log('SessionStarted..............');
    SessionStarted();
    SendMouse();
});

function JoinRoom(key){
    SessionKey = key;
    socket.emit('JoinRoom', key);
    
}
function SessionStarted(){
    console.log(document.childNodes);
    while (document.firstChild) {
        document.removeChild(document.firstChild);
    }
    console.log(document.childNodes);

    var base;

    mirror = new TreeMirror(document, {
        createElement: function(tagName) {
            if (tagName == 'SCRIPT') {
                var node = document.createElement('NO-SCRIPT');
                node.style.display = 'none';
                return node;
            }

            if (tagName == 'HEAD') {
                var node = document.createElement('HEAD');
                node.appendChild(document.createElement('BASE'));
                node.firstChild.href = base;
                return node;
            }
        }
    });
    window.parent.RemoveMouse();
    window.parent.AddMouse();

    socket.on('changes', function(msg){
        if (msg.base){
            base = msg.base;
        }
        if(msg.navigation){
            
        }
        if(msg.height){
            window.parent.ResizePreview(msg.width, msg.height);
        }
        if(msg.args){
            //console.log('Dom loaded');
            //console.log(msg.args);
            mirror[msg.f].apply(mirror, msg.args);
            if(msg.f == 'initialize'){
                socket.emit('DOMLoaded', {room: SessionKey});
            }
        }
        if(msg.scroll){
            //console.log('Scrolled  : ' +$(window).scrollTop());
            $(window).scrollTop(msg.scroll);
             //$('.modal').scrollTop(msg.scroll);
            /*$('.modal').scroll(function(){
                console.log('scrolled : '+ $('.modal').scrollTop() );
                $('.modal').scrollTop()});*/
        }

        if(msg.scrollevent){
            console.log('custom scroll');
            var event = msg.data;
            /*console.log(event.className);
            if(event.className != ''){
                element = document.getElementsByClassName(event.className);
                $(element).scrollTop(event.scrollTop);
            }
            else{*/

                

                element = mirror.deserializeNode(event.node);
                console.log(element);
                $(element).scrollTop(event.scrollTop);
                //console.log(element);
           // }

        }
    });
    socket.on('ClientMousePosition', function(msg){
        //console.log('Mouse changed');
        window.parent.MoveMouse(msg.PositionLeft, msg.PositionTop - $(document).scrollTop());
        
    });
}