$(document).ready(function() {

    var states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
              'RUNNING', 'FAILED', 'SUCCEEDED'];


    // var queueTable = $('#queue_summary_table').DataTable();
    var queueTable = $('#queue_summary_table').DataTable( {
      select: {
          style: 'os',
          items: 'cells'
      }
    } );
    var envTable = $('#comp_env_table').DataTable();
    var jobTable = $('#job_table').DataTable();

    // $('a').click(function(event) {
    //   console.log('howdy');
    //   // console.log('event.target ' + event.target);
    //   // console.log('event.target.attr("id") ' + event.target.attr('id'));
    //   selector = "#" + event.target.id;
    //   // console.log( + event.target.id);
    //   // console.log($(this).attr('id'));
    // });

    $('#queue_summary_table tbody').on( 'click', 'td', function () {
      console.log('ahahahah');
        console.log( queueTable.cell( this ).data() );
    } );


    // $('.dataTable').on('click', 'tbody td', function() {
    //   console.log("caught click on tbody td");
    //
    //   //get textContent of the TD
    //   console.log('TD cell textContent : ', $.trim(this.textContent));
    //   console.log('API row values : ', table.row(this).data());
    //   //get the value of the TD using the API (doesn't work)
    //   // console.log('value by API : ', table.cell({ row: this.parentNode.rowIndex, column : this.cellIndex }).data());
    // });

    // Use a "/test" namespace.
    // An application can open a connection on multiple namespaces, and
    // Socket.IO will multiplex all those connections on a single
    // physical channel. If you don't care about multiple channels, you
    // can set the namespace to an empty string.
    namespace = '/test';

    // Connect to the Socket.IO server.
    // The connection URL has the following format:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);

    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on('connect', function() {
        socket.emit('my_event', {data: 'I\'m connected!'});
    });




    socket.on('my_response', function(msg) {
         $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
     });

    socket.on('some event', function(msg) {
        console.log("hi");
        $('#log').append('<br>' + $('<div/>').text('Received from OOB: ' + msg.data).html());
    });
    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the "Received"
    // section of the page.
    /*
    When a message comes in, we need to do the following:
    - Does the job already exist? If not, add a row to the job table.
      If it does exist, check the new status. Is it 'later' than the previous status?
      If not, ignore the message.
      If it's a valid message, fade in (and out) a 'flash'-like message
      Update the job table row with new status.
      Decrement previous status in queue table (if new status > SUBMITTED)
      Increment new status in queue table.
    */
    socket.on('job_info', function(msg) {
        console.log("got a message!");
        console.log(msg);
        $('#log').append('<br>' + $('<div/>').text('Job ID: ' + msg.job_id + ', state: ' + msg.job_status).html());
    });

    // Interval function that tests message latency by sending a "ping"
    // message. The server then responds with a "pong" message and the
    // round trip time is measured.
    var ping_pong_times = [];
    var start_time;
    window.setInterval(function() {
        start_time = (new Date).getTime();
        socket.emit('my_ping');
    }, 1000);

    // Handler for the "pong" message. When the pong is received, the
    // time from the ping is stored, and the average of the last 30
    // samples is average and displayed.
    socket.on('my_pong', function() {
        var latency = (new Date).getTime() - start_time;
        ping_pong_times.push(latency);
        ping_pong_times = ping_pong_times.slice(-30); // keep last 30 samples
        var sum = 0;
        for (var i = 0; i < ping_pong_times.length; i++)
            sum += ping_pong_times[i];
        $('#ping-pong').text(Math.round(10 * sum / ping_pong_times.length) / 10);
    });

    // Handlers for the different forms in the page.
    // These accept data from the user and send it to the server in a
    // variety of ways
    $('form#emit').submit(function(event) {
        socket.emit('my_event', {data: $('#emit_data').val()});
        return false;
    });
    $('form#broadcast').submit(function(event) {
        socket.emit('my_broadcast_event', {data: $('#broadcast_data').val()});
        return false;
    });
    $('form#join').submit(function(event) {
        socket.emit('join', {room: $('#join_room').val()});
        return false;
    });
    $('form#leave').submit(function(event) {
        socket.emit('leave', {room: $('#leave_room').val()});
        return false;
    });
    $('form#send_room').submit(function(event) {
        socket.emit('my_room_event', {room: $('#room_name').val(), data: $('#room_data').val()});
        return false;
    });
    $('form#close').submit(function(event) {
        socket.emit('close_room', {room: $('#close_room').val()});
        return false;
    });
    $('form#disconnect').submit(function(event) {
        socket.emit('disconnect_request');
        return false;
    });
});
