'use strict';

var dbg = 1,
    ZEDIST = 5,
    DEFSPEED = -1,
    prevTemp = 0,
    socket,
    naturals,
    mouseDownHandler,
    connTimer,  //  timer to check for initial device attachment
    statTimer;  //  timer to request status updates


var attachBtnHandlers = function() {
    $('#settings').on('click', stgClickHandler);
    $('#print-action').on('click', paClickHandler);
    $('#devices').on('click', devsClickHandler);
    $(phLayer.canvas).on('click', canvasClickHandler)
        .on('mousemove', function(evt) {
            if(ct == undefined) {
                ct = new Indicator();
                ct.color = 'rgba(222, 222, 222, 0.4)';
            }

            ct.x = evt.offsetX - POINTERVISUALOFFSET;
            ct.y = evt.offsetY - POINTERVISUALOFFSET;
            redrawIndicators();
        }).on('mouseout', function(evt) {
            ct = undefined;
            redrawIndicators();
        });

    $('#homing > div').on('click', function(evt) {
        var mvr = { 
            Axis: $(evt.target).html().toUpperCase(), 
            Distance: -1, 
            Speed: DEFSPEED
        };

        notifyServer('action.home', mvr);
        homeUI(mvr.Axis);
    });

    $('#tools > .wrapper > .move-wrapper > div').on('click', function(evt) {
        var mvr = { Axis: $(evt.target).attr('data-axis').toUpperCase(), Distance: ZEDIST, Speed: DEFSPEED };
        if($(evt.target).hasClass('minus')) 
            mvr.Distance *= -1;
        notifyServer('action.std-move', mvr);
    });

    $('#console-area').on('click', consoleClickHandler);
    $('#console-nav').on('click', consoleNavClickHandler);

    var inp = $('#console-area > .wrapper > input');
    $(inp).on('blur', function(evt) { 
        $(inp).addClass('ghost')
            .val('enter manual commands here'); 
    }).on('focus', function(evt) { 
        $(evt.target).val('');
        if($(evt.target).hasClass('ghost'))
            $(evt.target).removeClass('ghost');
    }).on('keydown', function(evt) {
        if(evt.keyCode == 13) {
            if($(evt.target).val() != '' || $(evt.target).val().length > 2) {
                var val = $(evt.target).val().toUpperCase();
                if(val == 'HELP') {
                    //  list out macro options
                    $(evt.target).focus();
                    return
                }

                if(naturals[val] != undefined)
                    notifyServer('action.macro', val.toLowerCase());
                else 
                    pushConsoleMsg(val);
                $('#console-nav > .down').click();
            }

            $(evt.target).val('').focus();
        }
    });

    $('#tools > .wrapper > .power-wrapper > div').on('click', powerToggleClickHandler);
    $('#tools > .wrapper > .req').on('keydown', function(evt) {
        //  check if the user hit enter
        if(evt.keyCode == 13) {
            ($(evt.target).html()).replace(/\<br\>/g, '');
            $(evt.target).blur();
        }
    }).on('blur', function(evt) { 
        var temp = parseInt($(evt.target).html()),
            max  = parseInt($(evt.target).attr('data-max'));

        //  text in there that should be
        if(isNaN(temp) || temp < 0 || temp > max) {
            $(evt.target).html(prevTemp);
            return;
        }

        var onSwitch = $(evt.target).parent().find('.power-wrapper > .on');
        if(!$(onSwitch).hasClass('selected')) {
            $(onSwitch).click();
            return;
        }

        notifyServer('action.set-temp', { 
            Name:   $(evt.target).parent().attr('id').toUpperCase(),
            Value:  temp }
        );
    }).on('click', function(evt) { prevTemp = parseInt($(evt.target).html()); });
};

var detachBtnHandlers = function() {
    $('#settings').off('click');
    $('#print-action').off('click');
    $('#devices').off('click');
    $('#homing > div').off('click');
    $('#tools > .wrapper > .move-wrapper > div').off('click')
    $('#console-area').off('click');
    $('#console-nav').off('click');
    $('#console-area > .wrapper > input').off('blur').off('focus').off('keydown');
    $(phLayer.canvas).off('click', canvasClickHandler).off('mouseout').off('mousemove');
};

var attachSliderHandlers = function() {
    var xtb, xbb, ylb, yrb;

    //  x draggable limits
    xtb = $('#x').position().top + 139;     //  value was found through trial and error
    xbb = xtb + $('#x').height();

    //  y draggable limits
    ylb = $('#y').position().left + 182;    //  value was found through trial and error
    yrb = ylb + $('#y').width();

    $('#x > .handle').draggable({
        axis: 'y',
        containment: [0, xtb, 0, xbb],
        drag: function(evt) {
            mouseDownHandler = evt.target;
            ph.y = $(mouseDownHandler).position().top + Math.floor($(mouseDownHandler).height() / 2) + Math.floor(POINTERVISUALOFFSET / 2);
            redrawIndicators();
        }
    });

    $('#y > .handle').draggable({ 
        axis: 'x', 
        containment: [ylb, 0, yrb, 0],
        drag: function(evt) {
            mouseDownHandler = evt.target;
            ph.x = $(mouseDownHandler).position().left + Math.floor($(mouseDownHandler).width() / 2) + Math.floor(POINTERVISUALOFFSET / 2);
            redrawIndicators();
        }
    });
};

var slideListener = function(evt) {
    if(!$(evt.target).hasClass('slider')) { return; }

    if($(evt.target).attr('id') == 'y')
        evt.offsetY = ph.y + POINTERVISUALOFFSET;
    else
        evt.offsetX = ph.x + POINTERVISUALOFFSET;
    canvasClickHandler(evt);
};

//  =====================
//      click handlers
//  =====================
var stgClickHandler = function(evt) {
    if($('nav > div.btn').hasClass('selected')) return;

    $('#settings').addClass('selected');

    $('#settings-overlay').show();
    $('#settings-overlay > .close').on('click', function(evt) {
        $('#settings-overlay').hide();
        $('#settings').removeClass('selected');
    });

    $('#settings-overlay > div.nav-left > ul > li').on('click', function(evt) {
        if($(evt.target).hasClass('selected')) return;

        $('#settings-overlay > div.nav-left > ul > li.selected').removeClass('selected');
        $(evt.target).addClass('selected');

        //  TODO ::
    });
    $('#settings-overlay > div.nav-left > ul > li:first').click();
};

var paClickHandler = function(evt) {
    console.log(evt.target);
};

var devsClickHandler = function(evt) {
    if($('nav > div.btn').hasClass('selected')) return;

    $('#devices').addClass('selected');
    $('#devices-overlay').show();
    $('#devices-overlay > .close').on('click', function(evt) {
        $('#devices-overlay').hide();
        $('#devices').removeClass('selected');
    });
};

var canvasClickHandler = function(evt) {
    if((evt.offsetX == ph.y && evt.offsetY == ph.x)
        || evt.offsetX < 0 || evt.offsetX > w
        || evt.offsetY < 0 || evt.offsetY > h) 
            return;  //  don't need to do anything

    detachMovers();

    var osx, osy;
    osx = evt.offsetX - POINTERVISUALOFFSET;
    osy = evt.offsetY - POINTERVISUALOFFSET;

    //  send coords to device
    var dist = pixelToMillimeter(osy) + ',' + pixelToMillimeter(osx);
    notifyServer('action.multi-move', { Axis: 'X,Y', Distance: dist, Speed: DEFSPEED });

    // setup projected point indicator
    pp = new Indicator();
    pp.x = osx;
    pp.y = osy;
    pp.color = IND_GHOST_COLOR;

    movePrintHead(osx, osy);   
};

var consoleClickHandler = function(evt) {
    if(!$('#console-area > .output').is(':visible'))
        expandConsoleOutput();
    else {
        if($(evt.target).hasClass('handle') && $('#console-area > .output').is(':visible')) {
            collapseConsoleOutput();
            return;
        }
    }
};

var consoleNavClickHandler = function(evt) {
    var output  = $('#console-area > .output'),
        dur     = 800;

    //  scroll to bottom of list
    if($(evt.target).hasClass('down'))
        $(output).animate({ scrollTop: $(output)[0].scrollHeight }, 800);

    //  scroll to top of list
    if($(evt.target).hasClass('up'))
        $(output).animate({ scrollTop: 0 }, 800);
};

var powerToggleClickHandler = function(evt) {
    if($(evt.target).hasClass('selected')) return;

    var p = $(evt.target).parent()

    //  updated the ui
    $(p).find('.selected').removeClass('selected');
    $(evt.target).addClass('selected');

    //
    //  default to off but if the evt is via the 'on'
    //  button, get the temp and send it to the device.
    //  if evt is the 'off' button, then update the 
    //  .req value to 0
    var temp = 0;
    if($(evt.target).hasClass('on')) 
        parseInt($(p).parent().find('.req').html());
    else 
        $(p).parent().find('.req').html(0);

    notifyServer('action.set-temp', { 
        Name:   $(p).parent().attr('id').toUpperCase(),
        Value:  temp }
    );
};

//  ======================
//      socket handlers
//  ======================
var initSocket = function() {
    socket              = new WebSocket('ws://' + document.URL.substring(7) + "5dp-ui");
    socket.onmessage    = onSocketMsg;
    socket.onclose      = onSocketClose;
    socket.onerror      = onSocketError;
    socket.onopen       = onSocketOpen;
};

var onSocketMsg = function(evt) {
    // if(dbg) console.log(evt);

    var msg = JSON.parse(evt.data);
    switch(msg.Action) {
    case 'action.notify':
        notify(msg.Body);
        break;
    case 'action.nodevs':
        connTimer = setInterval(checkConn, 1500);
        break;
    case 'action.connected':
        attachDevice(msg);
        break;
    case 'action.disconnected':
        detachDevice(msg);
        break;
    case 'action.job':
        //  TODO ::
        break;
    case 'action.stats':
        updateDeviceStats(msg);
        break;
    default:
        break;
    }
};

var onSocketClose = function(evt) {
    window.clearInterval(statTimer);
    window.clearInterval(connTimer);

    //  TODO ::
    //  update status display

    socket = undefined;
    window.setTimeout(initSocket, 800);
};

var onSocketError = function(evt) {
    window.clearInterval(statTimer);
    window.clearInterval(connTimer);
    if(socket == undefined)
        window.setTimeout(initSocket, 800);
};

var onSocketOpen = function(evt) {
    //  TODO ::
    //  update status display

    connTimer = setInterval(checkConn, 500);   
};

var checkConn = function() {
    notifyServer('action.connection', '');
    window.clearInterval(connTimer);
};

var getDeviceStats = function(full) {
    notifyServer('action.stats', (full) ? 'full' : '');
};

var notifyServer = function(action, body) {
    var b = (typeof body == 'string') ? JSON.stringify(body).replace(/\"/g, '') : JSON.stringify(body);
    var msg = JSON.stringify({ DeviceName: (activeDev) ? activeDev.Name : '', Action: action, Body: b });

    if(socket != undefined && socket.readyState)
        socket.send(msg);
};

var pushConsoleMsg = function(cmd) {
    notifyServer('action.console', cmd);
};

var notify = function(msg) {
    console.log(msg);
};

//  start some ish
$(document).ready(function() {
    initSocket();
    displayGrid();
});