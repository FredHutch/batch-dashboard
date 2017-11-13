$(document).ready(function() {

  // $("#inner-message").hide();

  $("#myButton").click(function(){
    console.log("hi");
    showAlert({"job_name": "my job name", "job_status": "SUBMITTED"});
  });

    var showAlert = function(msg) {
      console.log("showing alert");
      $("#inner-message").html("Job " + msg.job_name + " has reached status " + msg.job_status + ".");
      $("#inner-message").fadeTo(2000, 500).slideUp(500, function(){
        $("#inner-message").slideUp(500);
      });

    }

    var states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
              'RUNNING', 'FAILED', 'SUCCEEDED'];


    var crement = function(queue, status, increase) {
      selector = "#" + queue + "_" + status;
      num = parseInt($.trim($(selector).text()));
      if (increase) {
        num++;
      } else {
        num--;
      }
      $(selector).html(num.toString());

    }

    var increment = function(queue, status) {
      crement(queue, status, true);
    }

    var decrement = function(queue, status) {
      crement(queue, status, false);
    }

    var getCurrentStatus = function(jobId) {
      return $.trim(jobTable.cell("#row_" + jobId, 3).data());
    }

    var setStatus = function(jobId, status) {
      jobTable.cell("#row_" + jobId, 3).data(status).draw();
    }

    var clearTables = function() {
        $(".dynamicDialogTable").find("tr:gt(0)").remove();
        $(".dynamicDialogTable").find("tr:gt(0)").remove();
    }


    // tables
    var queueTable = $('#queue_summary_table').DataTable();
    var envTable = $('#comp_env_table').DataTable();
    var jobTable = $('#job_table').DataTable();
    var jobDefTable = $("#job_def_table").DataTable();


/*
    // filters
    $("#queue_filter").change(function(){
        var queue = $("#queue_filter option:selected").text();
        console.log("you chose the queue "  + queue);
        jobTable.draw();
    });

    // filters
    $("#state_filter").change(function(){
        var state = $("#state_filter option:selected").text();
        console.log("you chose the state "  + state);
        jobTable.draw();
    });
*/

// Apply the search
 jobTable.columns().every( function () {
     var that = this;

     $( 'select', this.footer() ).on( 'change', function () {
         console.log("your filter is " + this.value);
         var searchString = this.value;
         if (this.value == "No Filter") {
             searchString = "";
             console.log("searchString changed to " + searchString);
         }
         if ( that.search() !== searchString ) {
             that
                 .search( searchString )
                 .draw();
         }
     } );
 } );


    // click event handler for tables

    // click event handler for queue table
    $('#queue_summary_table').on( 'click', '.queue', function (event) {
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_queue", { queue_name: id} )
        .done(function( obj ) {
          console.log( "JSON Data: " +obj );
          console.log("State is " + obj['state']);
          //alert(json);
          populateQueueDialog(obj);
          // alert(JSON.stringify(obj));
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for queues


    // click event handler for compute environment table
    $('#comp_env_table').on( 'click', '.compute_environment', function (event) {
      console.log("in click handler for compute environment");
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_env", { env_name: id} )
        .done(function( obj ) {
          // console.log( "JSON Data: " +obj );
          // console.log(JSON.stringify(obj));
          populateEnvDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for compute environment table



    // click event handler for job table
    $('#job_table').on( 'click', '.job_id', function (event) {
      console.log("in click handler for job table");
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_job", { job_id: id} )
        .done(function( obj ) {
          // console.log( "JSON Data: " +obj );
          // console.log(JSON.stringify(obj));
          populateJobDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for job table


    // click event handler for job definition table
    $('#job_def_table').on( 'click', '.jobdef', function (event) {
      console.log("in click handler for job definition table");
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_job_definition", { jobdef_id: id} )
        .done(function( obj ) {
          populateJobDefDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for job definition table



    var populateQueueDialog = function(obj) {
      $("#dialog_queue_header").html("Queue " + obj['jobQueueName']);
      $("#dialog_queue_name").html(obj['jobQueueName']);
      $("#dialog_queue_state").html(obj['state']);
      $("#dialog_queue_priority").html(obj['priority']);
      for (i in obj['computeEnvironmentOrder']) {
        var row = obj['computeEnvironmentOrder'][i];
        var segs = row['computeEnvironment'].split('/');
        var ceName = segs[segs.length -1];
        var html = "<tr><td>" + row['order'] + " </td><td>" + ceName + "</td></tr>\n";
        // FIXME what about making this a DataTable and appending data to it instead
        // of appending html?
        $("#dialog_queue_env_table").append(html);
      }
      $("#queue_dialog").modal();
    }

    var populateEnvDialog = function(obj) {
      $("#dialog_env_name").html(obj['computeEnvironmentName']);
      $("#dialog_env_arn").html(obj['computeEnvironmentArn']);
      $("#dialog_env_type").html(obj['type']);
      $("#dialog_env_status").html(obj['status']);
      $("#dialog_env_state").html(obj['state']);
      $("#dialog_env_service_role").html(obj['serviceRole']);
      $("#dialog_env_minvcpus").html(obj['computeResources']['minvCpus']);
      $("#dialog_env_desiredvcpus").html(obj['computeResources']['desiredvCpus']);
      $("#dialog_env_maxvcpus").html(obj['computeResources']['maxvCpus']);
      $("#dialog_env_instance_types").html(obj['computeResources']['instanceTypes'].join(", "));
      $("#dialog_env_instancerole").html(obj['computeResources']['instanceRole']);
      if (obj['computeResources'].hasOwnProperty('spotIamFleetRole')) {
          $("#dialog_env_spotfleetrole").html(obj['computeResources']['spotIamFleetRole']);
      }
      if (obj['computeResources'].hasOwnProperty('ec2KeyPair')) {
          $("#dialog_env_keypair").html(obj['computeResources']['ec2KeyPair']);
      }
      if (obj['computeResources'].hasOwnProperty('imageId')) {
          $("#dialog_env_amiid").html(obj['computeResources']['imageId']);
      }
      // leaving VPC alone for now. TODO fix
      $("#dialog_env_subnets").html(obj['computeResources']['subnets'].join(", "));
      $("#dialog_env_securitygroups").html(obj['computeResources']['securityGroupIds'].join(", "));

      // Tags
      var tags = obj['computeResources']['tags'];
      for (var key in tags) {
        var value = tags[key];
        var html = "<tr><td>" + key + "</td><td>" + value + "</td></tr>\n";
        // FIXME what about making this a DataTable and appending data to it instead
        // of appending html?
        $("#dialog_env_tag_table").append(html);
      }
      $("#env_dialog").modal();

    }

    var populateJobDialog = function(obj) {
      // job status
      $("#dialog_job_status").html(obj['status']);
      $("#dialog_job_createdat").html(new Date(obj['createdAt']));
      if (obj.hasOwnProperty('startedAt')) {
        $("#dialog_job_startedat").html(new Date(obj['startedAt']));
      }
      $("#dialog_job_queue").html(obj['jobQueue'].split("/").pop());

      // job attributes
      $("#dialog_job_id").html(obj['jobId']);
      $("#dialog_job_name").html(obj['jobName']);
      $("#dialog_job_jobdef").html(obj['jobDefinition'].split("/").pop());
      if (obj.hasOwnProperty('dependsOn')) {
        var html = "";
        var jobs = [];
        obj['dependsOn'].map(function(item){
          jobs.push(item['jobId']);
        });
        html = jobs.join(", ");
        $("dialog_job_dependson").html(html);
      }

      // attempts
      obj['attempts'].map(function(item, index) {
        var html = "<tr>\n";
        html += "<td>" + (index + 1) + "of " + obj['attempts'].length + "</td>\n";
        console.log("lsn = " + item['container']['logStreamName']);
        html += "<td><a target='_blank' href='/job_log?jobId=" + obj['jobId'] +  "&attempt=" + index + "'>View logs</a></td>\n";
        html += "<td>" + new Date(item['startedAt']) + "</td>\n";
        html += "<td>" + new Date(item['stoppedAt']) + "</td>\n";
        html += "</tr>";
        $("#dialog_job_attempts").append(html);
      });

      // resource requirements
      $("#dialog_job_role").html(obj['jobRoleArn']);
      $("#dialog_job_containerimage").html(obj['image']);

      // environment
      $("#dialog_job_command").html(obj['container']['command'].join(", "));
      $("#dialog_job_vcpus").html(obj['container']['vcpus']);
      $("#dialog_job_memory").html(obj['container']['memory'] + " MiB");


      // environment variables
      obj['container']['environment'].map(function item(){
        var html = "<tr>\n";
        html += "<td align='right'><b>" + item['name'] +  "</b></td>\n";
        html += "<td align='left' class='breakMe'>" + item['value'] +  "</td>\n";
        html += "</tr>\n"
        $("#dialog_job_envvars").append(html);
      });

      // parameters
      for (var key in obj['parameters']) {
        var value = obj['parameters'][key];
        var html = "<tr>\n";
        html += "<td align='right'><b>" + key +  "</b></td>\n";
        html += "<td align='left' class='breakMe'>" + value +  "</td>\n";
        html += "</tr>\n"
        $("#dialog_job_parameters").append(html);
      }

      //ulimits
      obj['container']['ulimits'].map(function(item){
        var html = "<tr>\n";
        html += "<td>" + item['name'] + "</td>\n";
        html += "<td>" + item['softLimit'] + "</td>\n";
        html += "<td>" + item['hardLimit'] + "</td>\n";
        html += "</tr>\n";
        $("#dialog_job_ulimits").append(html);
      });

      //volumes
      obj['container']['volumes'].map(function(item){
        var html="<tr>\n";
        html += "<td>" + item['name'] + "</td>\n";
        html += "<td>" + item['host']['sourcePath'] + "</td>\n";
        html += "</tr>\n";
        $("#dialog_job_volumes").append(html);
      });

      //mount points
      obj['container']['mountPoints'].map(function(item){
        var html="<tr>\n";
        html += "<td>" + item['containerPath'] + "</td>\n";
        html += "<td>" + item['sourceVolume'] + "</td>\n";
        html += "<td>" + item['readOnly'] + "</td>\n";
        $("#dialog_job_mountpoints").append(html);
      });

      $("#job_dialog").modal();


    }


var populateJobDefDialog = function(obj) {
  // job status
  var nameRevision = obj["jobDefinitionName"] + ":" + obj['revision'];
  $("#dialog_jobdef_header").html(nameRevision);
  $("#dialog_jobdef_namerevision").html(nameRevision);
  $("#dialog_jobdef_arn").html(obj["jobDefinitionArn"]);
  $("#dialog_jobdef_arn").html(obj['"jobDefinitionArn"']);
  $("#dialog_jobdef_status").html(obj["status"]);
  var containerProperties = obj['containerProperties'];
  console.log("containerProperties is " + containerProperties);
  if (containerProperties.hasOwnProperty("jobRoleArn")) {
    $("#dialog_jobdef_jobrolearn").html(containerProperties["jobRoleArn"]);
  }
  $("#dialog_jobdef_image").html(containerProperties["image"]);
  $("#dialog_jobdef_command").html(containerProperties['command'].join(", "));
  $("#dialog_jobdef_vcpus").html(containerProperties['vcpus']);
  $("#dialog_jobdef_memory").html(containerProperties['memory']);



  // attempts
  if (!obj.hasOwnProperty('retryStrategy')) {
      obj['retryStrategy'] = {attempts: 1};
  }
  $("#dialog_jobdef_attempts").html(obj['retryStrategy']['attempts']);


  // parameters
  for (var key in obj['parameters']) {
    var value = obj['parameters'][key];
    var html = "<tr>\n";
    html += "<td align='right'><b>" + key +  "</b></td>\n";
    html += "<td align='left' class='breakMe'>" + value +  "</td>\n";
    html += "</tr>\n"
    $("#dialog_jobdef_parameters").append(html);
}

// environment variables
containerProperties['environment'].map(function item(){
  var html = "<tr>\n";
  html += "<td align='right'><b>" + item['name'] +  "</b></td>\n";
  html += "<td align='left' class='breakMe'>" + item['value'] +  "</td>\n";
  html += "</tr>\n"
  $("#dialog_jobdef_envvars").append(html);
});


//ulimits
containerProperties['ulimits'].map(function(item){
  var html = "<tr>\n";
  html += "<td>" + item['name'] + "</td>\n";
  html += "<td>" + item['softLimit'] + "</td>\n";
  html += "<td>" + item['hardLimit'] + "</td>\n";
  html += "</tr>\n";
  $("#dialog_jobdef_ulimits").append(html);
});


//volumes
containerProperties['volumes'].map(function(item){
  var html="<tr>\n";
  html += "<td>" + item['name'] + "</td>\n";
  html += "<td>" + item['host']['sourcePath'] + "</td>\n";
  html += "</tr>\n";
  $("#dialog_jobdef_volumes").append(html);
});

//mount points
containerProperties['mountPoints'].map(function(item){
  var html="<tr>\n";
  html += "<td>" + item['containerPath'] + "</td>\n";
  html += "<td>" + item['sourceVolume'] + "</td>\n";
  html += "<td>" + item['readOnly'] + "</td>\n";
  $("#dialog_jobdef_mountpoints").append(html);
});

  $("#jobdef_dialog").modal();


}



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
        // TODO remove this:
        $('#log').append('<br>' + $('<div/>').text('Job ID: ' + msg.job_id + ', state: ' + msg.job_status).html());

        jobId = msg.job_id;
        newState = msg.job_status;
        queue = msg.job_queue;
        jobName = msg.job_name;

        // check if this job is already in the jobs table:
        len = jobTable.row("#row_" + jobId).length
        if (len == 1) { // job exists
          console.log("job already exists");
          currentState = getCurrentStatus(jobId);
          if (states.indexOf(currentState) >= states.indexOf(newState)) {
            console.log("state " + newState + " is not newer than " + currentState + ", ignoring message...");
            return;
          }
          decrement(queue, currentState);
          setStatus(jobId, newState);
        } else if (len == 0) { // job does not exist
          console.log("new job, welcome!");
          jobTable.row.add([
            queue,
            '<a id="' + jobId + '" js="true" class="job_id">' + jobId + '</a>',
            jobName,
            newState
          ]).draw();
          // increment cell in queue table
        } else {
          console.log("We should not be here, len is " + len + ".");
        }
        increment(queue, newState);
        showAlert(msg);
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
