var socket = undefined;
var SessionKey;
var oDOM;
var CDN = 'http://localhost:3000/';
var SocketCDN = 'http://localhost:3000';
var mirrorClient;


/* This block of code is to load inaccessible scripts that may be relative on mobile devices or behind a VPN or restricted network
 function getScriptURL(){
 var scriptsArray = document.getElementsByTagName('script');
 for(var i=0;i<scriptsArray.length -1; i++){
 $.get( scriptsArray[i].src, function( data ) {
 console.log(data);
 });
 }
 }

 */

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



function LoadAllScripts(){
    if (typeof jQuery == 'undefined') {
        loadScript(CDN + 'lib/js/jquery.js', function(){
            loadScript(CDN + 'lib/js/mutation_summary.js', function(){
                loadScript(CDN + 'lib/js/tree_mirror.js', function(){
                    //my code 
                    loadScript('https://cdn.socket.io/socket.io-1.1.0.js', function(){
                    //loadScript(SocketCDN + 'socket.io/socket.io.js', function(){
                        window.addEventListener('load', function() {
                            init();
                            //startMirroring();
                        });
                        
                    });
                })
            });
        })
    }
    else{
        loadScript(CDN + 'lib/js/mutation_summary.js', function(){
            loadScript(CDN + 'lib/js/tree_mirror.js', function(){
                //my code 
                loadScript('https://cdn.socket.io/socket.io-1.1.0.js', function(){
                //loadScript(SocketCDN + 'socket.io/socket.io.js', function(){
                    window.addEventListener('load', function() {
                        //AddMenu();
                        init();
                        //$('#MenuTable').css({left: ($(window).width() - 30), top: ($(window).height()/2) - 150});
                        //console.log('LOAD');
                        //console.log(document.body.childNodes);
                        
                    });
                    
                    
                    
                });
            })
        });
    }
}

function CheckChromeFrame(){
    loadScript('http://google.com/tools/dlpage/res/chromeframe/script/CFInstall.min.js', function(){
        CFInstall.check({
            mode: "popup"
        });
    });
}

function BrowserCheck(){
    var isIE = /*@cc_on!@*/false;
    if(isIE){
        CheckChromeFrame();
    }
    else{
        loadScript(CDN + 'lib/js/loader.js', function(){
            LoadAllScripts();
        });
    }
}

BrowserCheck();

function init(){
    yepnope({
        load : [
            CDN + 'lib/js/session.js',
            CDN + 'lib/css/screenshare.css'
        ],
        complete : function(){
            //startMirroring();
            AddMenu();
            $(window).resize(function() {
                if(socket != undefined){
                    socketSend({height: $(window).height(), width: $(window).width()});
                }
                $('#MenuTable').css({left: ($(window).width() - 30), top: ($(window).height()/2) - 150});
            });

            startMirroring();
        }
    });
}

function socketSend(msg) {
    socket.emit('changeHappened', {change: msg, room: sessvars.Session});
}

function startMirroring() {
    
    mirrorClient = new TreeMirrorClient(document, {
        initialize: function(rootId, children) {
            oDOM = {
                f: 'initialize',
                args: [rootId, children]
            }
        },

        applyChanged: function(removed, addedOrMoved, attributes, text) {
            /*console.log('Start');
            console.log(removed);
            console.log(addedOrMoved);
            console.log(attributes);
            console.log(text);*/
            if(socket != undefined){
                socketSend({
                    f: 'applyChanged',
                    args: [removed, addedOrMoved, attributes, text]
                });
            }
            //console.log('End');
        },

        complete : function(){
            if(sessvars.Session){
                //console.log()
                ContinueSession();
            }

        }

    });
}
function ContinueSession(){

    console.log('continue session.............');
    socket = io(SocketCDN);
    socket.on('connect', function(){
        socket.emit('PageChange', sessvars.Session);
        $('#RemoteStatus').text('Status: Waiting for connection.');
        socket.on('SessionStarted', function() {
            $('#RemoteStatus').text('Status: Connected!');
            socketSend({height: $(window).height(), width: $(window).width()});
            socketSend({ base: location.href.match(/^(.*\/)[^\/]*$/)[1] });
            console.log('oDOM');
            console.log(oDOM);
            socketSend(oDOM);
            SendMouse();
            $('body').append('<div id="AdminPointer"></div> ');

            $("*").on("scroll",function(event){

                var element = event.target;
                var n = mirrorClient.serializeNode(element);
                console.log(n);
                socketSend({scrollevent: true  , data : {className : event.target.className , scrollTop:event.currentTarget.scrollTop , node: n}});
            });
            $(window).scroll(function(){
                socketSend({scroll: $(window).scrollTop()});
            });
        });
        socket.on('AdminMousePosition', function(msg) {
            $('#AdminPointer').css({'left': msg.PositionLeft - 15, 'top': msg.PositionTop});
        });
        socket.on('DOMLoaded', function(){
            BindEverything();
        })
    });
}
function CreateSession(){
    //console.log('create');
    //socket = io(SocketCDN);
    socket = io(SocketCDN);

    SessionKey = document.getElementById('SessionKey').value;
    //console.log('SessionKey :' + SessionKey);
    socket.on('connect', function(){

        //console.log('create session.........');
        socket.emit('CreateSession', SessionKey);
        $('#RemoteStatus').text('Status: Waiting for connection.');
        socket.on('SessionStarted', function() {
            sessvars.Session = SessionKey;
            $('#RemoteStatus').text('Status: Connected!');
            socketSend({height: $(window).height(), width: $(window).width()});
            socketSend({ base: location.href.match(/^(.*\/)[^\/]*$/)[1] });
            
            socketSend(oDOM);
            SendMouse();
            $('body').append('<div id="AdminPointer"></div> ');
            $("*").on("scroll",function(event){

                 
                var element = event.target;
                var n = mirrorClient.serializeNode(element);
                socketSend({scrollevent: true  , data : {className : event.target.className , scrollTop:event.currentTarget.scrollTop , node: n}});
            });
            $(window).scroll(function(){
                //console.log('scrolled : '+ $(window).scrollTop() );
                socketSend({scroll: $(window).scrollTop()});
            });
        });
        socket.on('AdminMousePosition', function(msg) {
            $('#AdminPointer').css({'left': msg.PositionLeft - 15, 'top': msg.PositionTop});
        });
        socket.on('DOMLoaded', function(){
            BindEverything();
        });

    });
    
}


function BindEverything(){
    $(':input').each(function(){
        $(this).attr('value', this.value);
    });
    $('select').each(function(){
        var Selected = $(this).children('option:selected');
        $(this).children('option').removeAttr('selected', false);
        Selected.attr('selected', true);
        $(this).replaceWith($(this)[0].outerHTML);
    });
    $(':input').bind('keyup', function() {
        $(this).attr('value', this.value);
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
    });
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
        socket.emit('ClientMousePosition', {room: sessvars.Session, PositionLeft: e.pageX, PositionTop: e.pageY - 5});
        //console.log('on mouse move' +  e.pageX+" "+e.pageY + "     "+SessionKey);
    }
}

/*  ------------------------- Code for converting relative images to Data URLs -----------------------------------


 function getImageDataURL(url, success, error) {
 var data, canvas, ctx;
 var img = new Image();
 img.onload = function(){
 // Create the canvas element.
 canvas = document.createElement('canvas');
 canvas.width = img.width;
 canvas.height = img.height;
 // Get '2d' context and draw the image.
 ctx = canvas.getContext("2d");
 ctx.drawImage(img, 0, 0);
 // Get canvas data URL
 try{
 data = canvas.toDataURL();
 success({image:img, data:data});
 }catch(e){
 error(e);
 }
 };
 // Load image URL.
 try{
 img.src = url;
 }catch(e){
 error(e);
 }
 }

 getImageDataURL('image.png', function(succuss, error){
 $('#Response').append('<img src=\"' + succuss.data + '\">');
 })

 */


function AddMenu(){
    $('body').append('<table id="MenuTable" cellpadding="0">' +
        '<tr>' +
        '<td><div id="SlideMenu"><p class="rotate">HELP</p></div></td>' +
        '<td id="MainMenuTD"><h3>Remote Assistance</h3>' +
        '<p id="RemoteAssistMessage">To Start a remote session, please create a key and provide it to the representative assisting you. Keys should be between 6 and 10 characters.</p>' +
        '<input id="SessionKey"><p id="RemoteStatus">Status: Disconnected</p>' +
        '<a class="btn" style="width: 70%" onclick="CreateSession();">Create Key</a>' +
        '</td>' +
        '</tr>' +
        '</table>');
    $('#MenuTable').css({left: $(window).width() - 30, top: ($(window).height()/4) - 150});
    $('#SlideMenu').mouseenter(function(){
        if($('#MenuTable').offset().left == $(window).width() -30){
            $('#MenuTable').animate({left:'-=' + ($('#MenuTable').width() - 30)},'fast');
        }
    });
    $('#MenuTable').mouseleave(function(){
        if($(this).offset().left == $(window).width() - $('#MenuTable').width()){
            $(this).animate({left:'+=' + ($('#MenuTable').width() - 30)},'fast');
        }
    });
}