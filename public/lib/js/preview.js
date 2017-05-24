var CDN = 'http://localhost:3000/';
var SocketCDN = 'http://localhost:3000';

var socket = io(SocketCDN);
var SessionKey;
var element;
var mirror;
var mutationSummary;
var mirrorAdmin;
var oDOM;

var allowScroll = true;
var allowWindowScroll = true;
var scrollStarted = false;


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
    socket.emit('ViewerchangeHappened', {change: msg, room: SessionKey});
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

function Navigatetion(url){
    if(socket)
        socketSend({url : url });
    else{
        alert('please connect with visitor first.');
    }
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
            if (tagName == 'A'){
                var node = document.createElement('A');
                node.setAttribute('href','javascript:void(0);');
                return node;
            }
        },
        Prefilter : function(node , attibuteName){
            

        },

        Postfilter : function(node , attibuteName){
            if(node.tagName == 'FORM'){
                node.setAttribute('onsubmit','return false;');
                node.setAttribute('action','');
                return node;
            }

            return node;


        },
    }

    
    
    );

    socket.on('changes', function(msg){
        if (msg.base){
            base = msg.base;
            window.parent.SetUrl(base);
        }
        if(msg.navigation){
            
        }
        if(msg.height){
            window.parent.ResizePreview(msg.width, msg.height);
        }
        if(msg.args){
            //console.log('Dom loaded');
            //console.log(msg.args);
            //console.log(msg);
            if(msg.f == 'initialize'){
                if(mirrorAdmin)
                    mirrorAdmin.disconnect();

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
                        //console.log('admin change')
                        if(socket != undefined){
                            socketSend({
                                f: 'viewerApllyChanged',
                                args: [removed, addedOrMoved, attributes, text]
                            });
                        }
                        //console.log('End');
                    },

                    complete : function(){
                        //mirrorAdmin
                        //this.takeSummaries();

                    }

                });
                //testBind();
                BindEverything();
                /// now its time to send scroll position.
                window.parent.RemoveMouse();
                //window.parent.AddMouse();
                //SendScroll();
                SendClick();
                BindScroll();

            }

            else{
                mirrorAdmin.takeSummaries();
            }
        }
        if(msg.Windowscroll){
            //console.log('Scrolled  : ' +$(window).scrollTop());
            $(window).scrollTop(msg.Windowscroll);
        }

        if(msg.Winscroll){
            //console.log('Scrolled  : ' +$(window).scrollTop());
            $(window).scrollTop(msg.Winscroll);
        }

        if(msg.scrollevent){
            //console.log('scroll data ' + msg.event.scrollTop);
            var event = msg.data;
            element = mirror.deserializeNode(event.node);
            $(element).scrollTop(event.scrollTop);
            //console.log('scroll data ' + event.scrollTop);
            allowScroll = false;
        }

        if(msg.visitorScrollStart){
            allowScroll = false;
        }

        if(msg.visitorScrollStop){
            allowScroll = true;
        }

        if(msg.visitorWinScrollStart){
            allowWindowScroll = false;
        }

        if(msg.visitorWinScrollStop){
            console.log('visitorstop');
            allowWindowScroll = true;
        }
    });
    socket.on('ClientMousePosition', function(msg){
        //console.log('Mouse changed');
        window.parent.MoveMouse(msg.PositionLeft, msg.PositionTop - $(document).scrollTop());
        
    });
}

function testBind(){
    $(':input').each(function(){
        $(this).attr('value', this.value);
    });
    $(':input').bind('keyup', function() {
        $(this).attr('value', this.value);
    });
}

function BindEverything(){
    $(':input').each(function(){
        $(this).attr('value', this.value);
    });

    $(':input').bind('DOMAttrModified propertychange keyup paste', function() {
        $(this).attr('value', this.value);
    });

    $(':input').bind('change', function() {
        $(this).attr('value', this.defaultValue);
    });

    $('select').each(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).attr('value' , $(Selected).attr('value') );
        //$(this).replaceWith($(this)[0].outerHTML);
    });

    $('select').bind('change',function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        //$(this).attr('value' , $(Selected).attr('value') );
        //$(this).replaceWith($(this)[0].outerHTML);
    });

    /*$('select').each(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).replaceWith($(this)[0].outerHTML);
    });
    $('select').change(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).replaceWith($(this)[0].outerHTML);
        $('select').unbind('change');
        $('select').change(function(){
            var Selected = $(this).children('option:selected');
            $(this).children('option').removeAttr('selected', false);
            Selected.attr('selected', true);
            $(this).replaceWith($(this)[0].outerHTML);
            $('select').unbind('change');
        });
    });*/
}

function BindScroll(){

    $(window).scroll(function() {
        if(allowWindowScroll){
            clearTimeout($.data(this, 'scrollTimer'));
            $.data(this, 'scrollTimer', setTimeout(function() {
                // do something
                //if(allowWindowScroll){
                    socketSend({viwerWinScrollStop : true});
                    //console.log('scroll stop');
                    scrollStarted = false;
                //}   
                
            }, 1000));

        
            if(!scrollStarted){
                socketSend({viwerWinScrollStart : true});
                scrollStarted = true;
            }
            
            socketSend({Winscroll: $(window).scrollTop()});
            //console.log('send ' + $(window).scrollTop());
        }
    });


    $("*").on("scroll",function(event){
        if(allowScroll){
            var element = event.target;
            var n = mirrorAdmin.serializeNode(element);
            //console.log(n);
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