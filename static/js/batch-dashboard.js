$(document).ready(function() {


  // get current user (if there is one)
  $.ajax("/get_current_user").done(function(data) {
    if (data == null) {
      model.username("not logged in");
      model.isLoggedIn(false);
    } else {
      model.username(data);
      model.isLoggedIn(true);
    }
  });


  var resetHourglass = function(payload) {
    $(".reload").attr("src", "/images/refresh.png");
  }


    var states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
              'RUNNING', 'FAILED', 'SUCCEEDED'];



    var getCurrentStatus = function(jobId) {
      return $.trim(jobTable.cell("#row_" + jobId, 3).data());
    }

    var setStatus = function(jobId, status) {
      jobTable.cell("#row_" + jobId, 3).data(status).draw();
    }

    var clearTables = function() {
        $(".dynamicDialogTable").find("tr:gt(0)").remove();
    }


    // tables
    var queueTable = $('#queue_summary_table').DataTable(
      {
        "ajax": "/get_queue_table_data",
        "columnDefs": [
          {
            "render": function(data, type, row) {
              return '<a id="' + data + '" class="queue">' + data + '</a>';
            },
            targets: 0
          }
        ]
      }
    );
    var envTable = $('#comp_env_table').DataTable(
      {
        "ajax": "/get_env_table_data",
        "columnDefs": [
          {
            "render": function(data, type, row) {
              return '<a id="' + data + '" class="compute_environment">' + data + '</a>';
            },
            targets: 0
          }
        ]
      }
    );
    var jobTable = $('#job_table').DataTable({
        "ajax": "/get_job_table_data",
        "columnDefs": [
          {
            "render": function(data, type, row) {
              return '<a id="' + data + '" class="job_id">' + data + '</a>'
            },
            targets: 1
          }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'copyHtml5',
                title: null,
                text: 'Copy to clipboard'
            }
        ]
    });
    var jobDefTable = $("#job_def_table").DataTable(
      {
        "ajax": "/get_jobdef_table_data",
        "columnDefs": [
          {
            "render": function(data, type, row) {
              return '<a class="jobdef" id="' + row[0] +  ':' + row[1] + '">' + data + '</a>'
            },
            targets: 0
          }
        ]
      }
    );



// Apply the search
 jobTable.columns().every( function () {
     var that = this;

     $( 'select', this.footer() ).on( 'change', function () {
         var searchString = this.value;
         if (this.value == "No Filter") {
             searchString = "";
         }
         if ( that.search() !== searchString ) {
             that
                 .search( searchString )
                 .draw();
         }
     } );
 } );

    // various click handlers/listeners

    // click on one of the statuses of a parent array job
    $("#array_job_status_table").on('click', ".child_status", function(event) {
        var id = $(event.target).attr('id');
        var segs = id.split("_");
        var jobId = segs[0];
        var status = segs[1];
        var td = "#" + "child_" + status.toLowerCase() + "_count";
        $(".child_count").css("border", "0");
        $(td).css("border", "1px solid black");

        $.getJSON( "/describe_job", { job_id: jobId, child_state: status} )
          .done(function( obj ) {
            updateChildInfo(obj);
          })
          .fail(function( jqxhr, textStatus, error ) {
            var err = textStatus + ", " + error;
            console.log( "Request Failed: " + err );
          });
    });

    // click on a child job
    $("#array_job_child_table").on('click', ".describe_child_job", function(event){
        var id = $(event.target).attr('id');

        $.getJSON( "/describe_job", { job_id: id } )
          .done(function( obj ) {
            clearTables();
            populateJobDialog(obj);
            $('#job_dialog').show().scrollTop(0);
          })
          .fail(function( jqxhr, textStatus, error ) {
            var err = textStatus + ", " + error;
            console.log( "Request Failed: " + err );
          });

    });

    // return to parent job
    $("#displaying_child_job").on('click', "#return_to_parent_job", function(event){
        var id = $("#dialog_job_id").html();
        var segs = id.split(":");
        var jobId = segs[0];

        $.getJSON( "/describe_job", { job_id: jobId } )
          .done(function( obj ) {
            clearTables();
            populateJobDialog(obj);
            $('#job_dialog').show().scrollTop(0);
          })
          .fail(function( jqxhr, textStatus, error ) {
            var err = textStatus + ", " + error;
            console.log( "Request Failed: " + err );
          });
    });



    // click event handler for tables

    // click event handler for queue table
    $('#queue_summary_table').on( 'click', '.queue', function (event) {
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_queue", { queue_name: id} )
        .done(function( obj ) {
          populateQueueDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for queues

    // click reload button for queues table
    $('#reload_queue_table').on('click', function(event) {
      queueTable.ajax.reload(resetHourglass);
    })

    // click reload button for envs table
    $('#reload_env_table').on('click', function(event) {
      envTable.ajax.reload(resetHourglass);
    })


    // click reload button for jobs table
    $('#reload_job_table').on('click', function(event) {
      jobTable.ajax.reload(resetHourglass);
    })

    // click reload button for job definitions table
    $('#reload_jobdef_table').on('click', function(event) {
      jobDefTable.ajax.reload(resetHourglass);
    })

    $(".reload").on('click', function(event) {
      var selector = "#" + event.target.id;
      $(selector).attr("src", "/images/hourglass.png");
    })



    // listen for draw event on queue table so we can grab distinct queue names
    $("#queue_summary_table").on('draw.dt', function(event) {
      $("#queue_filter").empty();
      $("#queue_filter").append("<option>No Filter</option>");
      var data = queueTable.rows().data();
      for (var i = 0; i < data.length; i++) {
        $("#queue_filter").append("<option>" + data[i][0] + "</option>");
      }

    })

    //focus username element when login dialog is shown
    $('#loginModal').on('shown.bs.modal', function () {
      $('#username').focus();
    })

    // allow the enter key to submit the login form:
    $('#password').keypress(function (e) {
      if (e.which == 13) {
        doLogin();
      }
    });


    // click event handler for compute environment table
    $('#comp_env_table').on( 'click', '.compute_environment', function (event) {
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_env", { env_name: id} )
        .done(function( obj ) {
          populateEnvDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for compute environment table



    // click event handler for job table
    $('#job_table').on( 'click', '.job_id', function (event) {
      clearTables();
      var id = $(event.target).attr('id');
      $.getJSON( "/describe_job", { job_id: id} )
        .done(function( obj ) {
          populateJobDialog(obj);
        })
        .fail(function( jqxhr, textStatus, error ) {
          var err = textStatus + ", " + error;
          console.log( "Request Failed: " + err );
        });
    }); // end of click event handler for job table


    // click event handler for job definition table
    $('#job_def_table').on( 'click', '.jobdef', function (event) {
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



    // "submit job" listener
    $("body").on('click', "#submit_job", function() {
        var data = jobDefTable.rows().data();
        var tmp = [];
        if (model.jobDefinitionList().length == 0) {

            for (var i = 0; i < data.length; i++) {
                tmp.push({name: data[i][0], revision: data[i][1]});
            }
            tmp.sort(function(a, b) {
                if (a['name'] == b['name']) {
                    //return ((x.Name == y.Name) ? 0 : ((x.Name > y.Name)? 1: -1));
                    return a['revision'] == b['revision'] ? 0 : a['revision'] < b['revision'] ? 1 : -1;
                } else {
                    return a['name'].toLowerCase() == b['name'].toLowerCase ? 0 : a['name'].toLowerCase() > b['name'].toLowerCase() ? 1 : -1;
                }
            });
            var tmp2 = [];
            for (var i = 0; i < tmp.length; i++) {
                tmp2.push(tmp[i]['name'] + ":" + tmp[i]['revision']);
            }
            // tmp2.unshift("");
            model.jobDefinitionList(tmp2);
        }
        if (model.queueList().length == 0) {
            var data = queueTable.rows().data();
            var tmp = [];
            for (var i = 0; i < data.length; i++) {
                tmp.push(data[i][0]);
            }
            model.queueList(tmp);
        }
        $("#submit_job_definitions").chosen({width: "300px"});
        $("#submit_job_queues").chosen({width: "150px"});
        model.jobType("single");
        $("#submit_job_dialog").modal('show');
    });

    // user picks a different job definition in job submit dialog
    // this means we have to reset a bunch of fields in model.submitJob
    $("#submit_job_definitions").on('change', function(evt, params) {
        console.log("value has changed to");
        if (params && params.hasOwnProperty("selected")) {
            // console.log(params.selected);
            // console.log(model.submitJob());
            console.log(model.submitJob().selectedJobDef())
            // TODO more to come
        }
    });



    // job definition table state listener
    // when table data has been loaded, we can allow job submission
    // (provided user is logged in)
    $("#job_def_table").on('xhr.dt', function() {
        model.jobDefsLoaded(true);
    })

    $("#queue_summary_table").on('xhr.dt', function() {
        model.queuesLoaded(true);
    })

    // end of listeners / click handlers (?)

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

    var updateChildInfo = function(obj) {
        var summary = obj['arrayProperties']['statusSummary'];
        states.map(function(state){
           var selector = "#child_" + state.toLowerCase() + "_count";
           var htmlStr = '<a class="child_status" id="'+obj['jobId']+'_'+state+'">';
           htmlStr += summary[state] + "</a>"
           $(selector).html(htmlStr);
        });
        //array_job_child_table
        $("#array_job_child_table").find("tr:gt(0)").remove();
        obj['childrenForStatus'].map(function(child){
            var row = document.createElement("tr");
            var jobTd = document.createElement("td");
            var jobA = document.createElement("a");
            jobA.setAttribute("class", "describe_child_job");
            jobA.setAttribute("id", child['jobId']);
            var jobIdText = document.createTextNode(child['jobId']);
            jobA.appendChild(jobIdText)
            jobTd.appendChild(jobA);
            row.appendChild(jobTd);
            var jobNameTd = document.createElement("td");
            var jobNameText = document.createTextNode(child['jobName']);
            jobNameTd.appendChild(jobNameText);
            row.appendChild(jobNameTd);
            var jobStatusTd = document.createElement("td");
            var jobStatusText = document.createTextNode(child['status']);
            jobStatusTd.appendChild(jobStatusText);
            row.appendChild(jobStatusTd);
            var createdAtTd = document.createElement("td");
            var createdAtText = document.createTextNode(new Date(child['createdAt']));
            createdAtTd.appendChild(createdAtText);
            row.appendChild(createdAtTd);
            $("#array_job_child_table").append(row);
        });
    }

    var populateJobDialog = function(obj) {
      // job status
      obj['createdAt'] = new Date(obj['createdAt']);
      obj['jobQueue'] = obj['jobQueue'].split("/").pop();
      obj['jobDefinition'] = obj['jobDefinition'].split("/").pop();

      if (obj.hasOwnProperty('startedAt')) {
        obj['startedAt'] = new Date(obj['startedAt']);
      } else {
        obj['startedAt'] = '';
      }

      obj['dependsOnComputed'] = function() {
          if (obj.hasOwnProperty('dependsOn')) {
              var html = "";
              var jobs = [];
              obj['dependsOn'].map(function(item){
                var row = item['jobId'];
                if (item.hasOwnProperty('type')) {
                  row += " (" + item['type'] + ")";
                }
                jobs.push(row);
              });
              html = jobs.join(", ");
              return html
          } else {
            return ""
          }
      }


      canTerminate = function() {
          if (!model.isLoggedIn()) return false;
          try {
            var envVars = obj.container.environment;
            for (var i = 0; i < envVars.length; i++) {
              item = envVars[i];
              if (item['name'] == ['AWS_BATCH_JOB_SUBMITTED_BY']) {
                return item['value'] == model.username()
              }
            }
            return false;
          } catch (err) {
            return false;
          }
      }

      canCancel = function() {
        if (!canTerminate()) return false;
        return ['SUBMITTED', 'PENDING', 'RUNNABLE'].includes(obj['status']);
      }

      cancelJob = function() {
        $.ajax({
          method: "POST",
          url: "/gui_cancel_job",
          contentType: "application/json",
          data: JSON.stringify({jobId: obj['jobId']})
        }).done(function(msg) {
          alert("Job canceled!");
        }).fail(function(msg) {
          alert("Error trying to cancel job:" + msg['responseText']);
        });
      }

      terminateJob = function()  {
        $.ajax({
          method: "POST",
          url: "/gui_terminate_job",
          contentType: "application/json",
          data: JSON.stringify({jobId: obj['jobId']})
        }).done(function(msg) {
          alert("Job terminated!");
        }).fail(function(msg) {
          alert("Error trying to terminate job:" + msg['responseText']);
        });
      }



      model.job(obj);


      $("#array_job_details").hide();
      $("#displaying_child_job").hide();
      if (obj.hasOwnProperty('arrayProperties')) {
          if (obj['arrayProperties'].hasOwnProperty('size')) {
              // this is an array parent job

              var td = "#" + "child_" + obj['status'].toLowerCase() + "_count";
              $(".child_count").css("border", "0");
              $(td).css("border", "1px solid black");

              $("#array_job_details").show();
              updateChildInfo(obj);
          } else if (obj['arrayProperties'].hasOwnProperty('index')) {
              // this is an array child job
              $("#displaying_child_job").show();

          }
      }
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
          var row = item['jobId'];
          if (item.hasOwnProperty('type')) {
            row += " (" + item['type'] + ")";
          }
          jobs.push(row);
        });
        html = jobs.join(", ");
        $("#dialog_job_dependson").html(html);
      }

      // attempts
      obj['attempts'].map(function(item, index) {
        var html = "<tr>\n";
        html += "<td>" + (index + 1) + "of " + obj['attempts'].length + "</td>\n";
        html += "<td><a target='_blank' href='/job_log?jobId=" + obj['jobId'] +  "&attempt=" + index + "'>View logs</a></td>\n";
        html += "<td>" + new Date(item['startedAt']) + "</td>\n";
        html += "<td>" + new Date(item['stoppedAt']) + "</td>\n";
        html += "</tr>";
        $("#dialog_job_attempts").append(html);
      });

      // resource requirements
      $("#dialog_job_role").html(obj['container']['jobRoleArn']);
      $("#dialog_job_containerimage").html(obj['container']['image']);

      // environment
      $("#dialog_job_command").html(obj['container']['command'].join(", "));
      $("#dialog_job_vcpus").html(obj['container']['vcpus']);
      $("#dialog_job_memory").html(obj['container']['memory'] + " MiB");


      // environment variables
      obj['container']['environment'].map(function(item){
        var html = "<tr>\n";
        html += "<td align='right'><b>" + item['name'] +  "</b></td>\n";
        var id = "ENV_" + item['name'];
        html += "<td id='" + id + "' align='left' class='breakMe'>" + item['value'] +  "</td>\n";
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

      if (obj['container'].hasOwnProperty('logStreamName')) {
          var attempt = obj['attempts'].length -1;
          var jobId = obj['jobId'];
          $("#dialog_job_log_link").html("<a target='_blank' href='/job_log?jobId=" + jobId + "&attempt=" + attempt + "'>View logs for the most recent attempt in the CloudWatch console</a>");
      } else {
          if (obj.hasOwnProperty('arrayProperties') && obj['arrayProperties'].hasOwnProperty('size')) {
              $("#dialog_job_log_link").html("Select an individual child job and view its logs.");
          } else {
              $("#dialog_job_log_link").html("Only visible if job has been in <B>RUNNING</B> state.");
          }

      }

      $("#job_dialog").modal();


    }


var populateJobDefDialog = function(obj) {
  // job status

  obj['nameRevision'] = function() {
      return obj.jobDefinitionName + ":" + obj.revision;
  }

  obj['containerProperties']['computedCommand'] = function() {
      return obj.containerProperties['command'].join(", ");
  }

  // attempts
  if (!obj.hasOwnProperty('retryStrategy')) {
      obj['retryStrategy'] = {attempts: 1};
  }


  model.jobDefinition(obj);

  var nameRevision = obj["jobDefinitionName"] + ":" + obj['revision'];
  $("#dialog_jobdef_header").html(nameRevision);
  $("#dialog_jobdef_namerevision").html(nameRevision);
  $("#dialog_jobdef_arn").html(obj["jobDefinitionArn"]);
  $("#dialog_jobdef_arn").html(obj['"jobDefinitionArn"']);
  $("#dialog_jobdef_status").html(obj["status"]);
  var containerProperties = obj['containerProperties'];
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

}); // end of ready function

// utilities

var spaceDelimitedToJson = function(self) {
        if (typeof(self.submitJob().spaceDelimitedCommand()) === "undefined") {
            return "[]";
        }
        var retA = [];
        var idx = 0;
        var inQuotedString = false;
        var currentItem = "";
        var str = self.submitJob().spaceDelimitedCommand();
        for (var i = 0; i < str.length; i++) {
            var ch = str.charAt(i);
            if (ch == "'") {
                inQuotedString = !inQuotedString;
                currentItem += "'";
                if (!inQuotedString) {
                    retA[idx++] = currentItem;
                    currentItem = "";
                }
            // TODO handle space after double-quote (?)
            // TODO handle space after single quote (?)
            } else if (ch == ' ') {
                if (inQuotedString) {
                    currentItem += ' ';
                } else {
                    if (str.charAt(i-1) == "'") {
                        retA[idx] = currentItem;
                    } else {
                        retA[idx++] = currentItem;
                    }
                    currentItem = "";
                }
            } else if (ch == '"') {
                currentItem += '\\' + '"';
                retA[idx] = currentItem;
            } else if (ch == '\\') {
                currentItem += '\\\\';
                retA[idx] == currentItem;
            } else {
                // console.log("got a nice '" + ch + "'");
                currentItem += ch;
                retA[idx] = currentItem;
            }
        }

        self.submitJob().commandItems(retA);
        // console.log("set commandItems to " + self.submitJob().commandItems() + ", length is " + self.submitJob().commandItems().length);
        for (var i = 0; i < retA.length; i++) {
            retA[i] =  '  "' + retA[i] + '"';
        }
        var ret = "[\n" + retA.join(",\n") + "\n]";
        return ret;
}


// begin knockout model code

function DashboardViewModel() {
  var self = this;

  self.username = ko.observable();
  self.isLoggedIn = ko.observable(false);
  self.job = ko.observable();
  self.submitJob = ko.observable({name: '', arraySize: null, nToN: null,
    runChildrenSequentially: false, selectedJobDef: ko.observable(),
    selectedQueue: ko.observable(), jobDependsOn: ko.observable(),
    spaceDelimitedCommand: ko.observable(), commandItems: ko.observableArray()
  });
  self.submitJob().jsonCommand = ko.computed(function() {return spaceDelimitedToJson(this)}, this);
  self.jobDefinition = ko.observable();
  self.jobDefinitionList = ko.observableArray();
  self.queueList = ko.observableArray();
  self.jobDefsLoaded = ko.observable(false);
  self.queuesLoaded = ko.observable(false);
  self.jobType = ko.observable("single");

  self.isSubmittingArrayJob = ko.computed(function() {
      return self.jobType() == "array";
  }, this);

  self.okToSubmit = ko.computed(function() {
      // FIXME remove comments below:
      return /* self.isLoggedIn() && */ self.jobDefsLoaded() && self.queuesLoaded();
  }, this);

  login = function() {
    $("#loginModal").modal();
    $("#username").focus();
  }

  logout = function() {
    $.ajax({url: '/logout',
            success: function(response) {
              loggedInUser = null;
              self.username("not logged in");
              self.isLoggedIn(false);
              // $('#username-display').html('not logged in');
            }, error: function(xhr) {
              console.log("ajax error: " +  xhr);
            }})
  }

  doLogin = function() {
    var username = $('#username').val();
    var password = $('#password').val();

    $.ajax({url: "/login",
            data: {username: username, password: password},
            method: 'POST',
            success: function(response) {
              if (response == null) {
                alert("Invalid login");
              } else {
                self.username(response);
                self.isLoggedIn(true);
                loggedInUser = response;
                $('#loginModal').modal('toggle');
              }

            }, error: function(xhr) {
              alert("Error logging in!");
            }})
  }


} // end of UserViewModel

var model = new DashboardViewModel()
ko.applyBindings(model);
