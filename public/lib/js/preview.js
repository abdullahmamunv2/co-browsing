var CDN = 'http://localhost:3000/';
var SocketCDN = 'http://localhost:3000';

var socket = io(SocketCDN);
var SessionKey;
var element;
var mirror;
var mutationSummary;
var mirrorAdmin;
var oDOM;

var allowScroll=true;


function loadScript(sScriptSrc, oCallback) {
    var oHead = document.getElementsByTagName('head')[0];
    var oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.src = sScriptSrc;
    oScript.onload = oCallback;
    oScript.onreadystatechange = function() {
        if (this.readyState == 'loaded' ||this.readyState == 'complete') {
            oCallback();
        }
    };
    oHead.appendChild(oScript);
}


/// this is a plugin for special event like scrollstart and scrollstop
function LoadPlugInScripts(){
    loadScript(CDN + 'lib/js/scrollEvent.js', function(){

    });
}

LoadPlugInScripts();

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


function SendScroll(){
    $("*").on("scroll",function(event){
        //console.log('send scroll');
        var element = event.target;
        var n = mirrorAdmin.serializeNode(element);
        socket.emit('AdminScrollPosition', {node : n,scrollLeft: event.currentTarget.scrollLeft, scrollTop: event.currentTarget.scrollTop, room: SessionKey});
        //socketSend({scrollevent: true  , data : {className : event.target.className , scrollTop:event.currentTarget.scrollTop , node: n}});
    });
}

function SendClick(){
    $(document).click(function(event) {
        var element = event.target;
        var n = mirrorAdmin.serializeNode(element);
        socket.emit('AdminonClick', {node : n, room: SessionKey});
    });
}

function socketSend(msg) {
    socket.emit('ViewrchangeHappened', {change: msg, room: SessionKey});
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
                //node.appendChild(document.createElement('BASE'));
                //node.firstChild.href = base;
                return node;
            }
        }
    });

    socket.on('changes', function(msg){
        if (msg.base){
            //base = msg.base;
        }
        if(msg.navigation){
            
        }
        if(msg.height){
            window.parent.ResizePreview(msg.width, msg.height);
        }
        if(msg.args){
            //console.log('Dom loaded');
            //console.log(msg.args);
            if(msg.f=='initialize'){
                while (document.firstChild) {
                    document.removeChild(document.firstChild);
                }
            }
            mirror[msg.f].apply(mirror, msg.args);
            if(msg.f == 'initialize'){
                socket.emit('DOMLoaded', {room: SessionKey});
                /// after loading DOM successfully we can listen any change in DOM using MutationSummery.

                mirrorAdmin = new TreeMirrorClient(document, {
                    initialize: function(rootId, children) {
                        oDOM = {
                            f: 'initialize',
                            args: [rootId, children]
                        }
                    },
                    applyChanged: function(removed, addedOrMoved, attributes, text) {
                        //console.log('Admin Changed');
                        if(socket != undefined){
                            //socket.emit('AdminChanged', {f:'applyChanged',args: [removed, addedOrMoved, attributes, text], room: SessionKey});
                        }
                        //console.log('End');
                    },
                    complete : function(){}
                });

                /// now its time to send scroll position.
                window.parent.RemoveMouse();
                //window.parent.AddMouse();
                //SendScroll();
                SendClick();
                BindScroll();

                $(window).scroll(function(){
                    socketSend({Windowscroll: $(window).scrollTop()});
                });

            }
        }
        if(msg.scroll){
            //console.log('Scrolled  : ' +$(window).scrollTop());
            $(window).scrollTop(msg.Windowscroll);
        }

        if(msg.scrollevent){
            //console.log('scroll data ' + msg.event.scrollTop);
            var event = msg.data;
            element = mirror.deserializeNode(event.node);
            $(element).scrollTop(event.scrollTop);
            console.log('scroll data ' + event.scrollTop);
            allowScroll = false;
        }

        if(msg.visitorScrollStart){
            allowScroll = false;
        }

        if(msg.visitorScrollStop){
            allowScroll = true;
        }
    });
    socket.on('ClientMousePosition', function(msg){
        //console.log('Mouse changed');
        window.parent.MoveMouse(msg.PositionLeft, msg.PositionTop - $(document).scrollTop());
        
    });
}

function BindScroll(){
    $("*").on("scroll",function(event){
        if(allowScroll){
            var element = event.target;
            var n = mirrorAdmin.serializeNode(element);
            console.log(n);
            socketSend({scrollevent: true  , data : {scrollTop:event.currentTarget.scrollTop , node: n}});
        }
    });

    $("*").on("scrollstart", function(event){
        if(allowScroll){
            socketSend({viwerScrollStart : true});
        }
    });

    $("*").on("scrollstop", function(event){
        if(allowScroll){
            socketSend({viwerScrollStop : true});
        }
    });

}