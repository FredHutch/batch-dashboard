$(document).ready(function () {

  // $("#inner-message").hide();

  $("#myButton").click(function () {
    console.log("hi");
    showAlert({ "job_name": "my job name", "job_status": "SUBMITTED" });
  });

  var showAlert = function (msg) {
    console.log("showing alert");
    $("#inner-message").html("Job " + msg.job_name + " has reached status " + msg.job_status + ".");
    $("#inner-message").fadeTo(2000, 500).slideUp(500, function () {
      $("#inner-message").slideUp(500);
    });

  }

  var states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
    'RUNNING', 'FAILED', 'SUCCEEDED'];


  var crement = function (queue, status, increase) {
    selector = "#" + queue + "_" + status;
    num = parseInt($.trim($(selector).text()));
    if (increase) {
      num++;
    } else {
      num--;
    }
    $(selector).html(num.toString());

  }

  var increment = function (queue, status) {
    crement(queue, status, true);
  }

  var decrement = function (queue, status) {
    crement(queue, status, false);
  }

  var getCurrentStatus = function (jobId) {
    return $.trim(jobTable.cell("#row_" + jobId, 3).data());
  }

  var setStatus = function (jobId, status) {
    jobTable.cell("#row_" + jobId, 3).data(status).draw();
  }

  var clearTables = function () {
    $(".dynamicDialogTable").find("tr:gt(0)").remove();
  }


  // tables
  var queueTable = $('#queue_summary_table').DataTable(
    {
      "ajax": "/get_queue_table_data",
      "columnDefs": [
        {
          "render": function (data, type, row) {
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
          "render": function (data, type, row) {
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
        "render": function (data, type, row) {
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
          "render": function (data, type, row) {
            return '<a class="jobdef" id="' + row[0] + ':' + row[1] + '">' + data + '</a>'
          },
          targets: 0
        }
      ]
    }
  );


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
  jobTable.columns().every(function () {
    var that = this;

    $('select', this.footer()).on('change', function () {
      console.log("your filter is " + this.value);
      var searchString = this.value;
      if (this.value == "No Filter") {
        searchString = "";
        console.log("searchString changed to " + searchString);
      }
      if (that.search() !== searchString) {
        that
          .search(searchString)
          .draw();
      }
    });
  });

  // various click handlers

  // click on one of the statuses of a parent array job
  $("#array_job_status_table").on('click', ".child_status", function (event) {
    var id = $(event.target).attr('id');
    var segs = id.split("_");
    var jobId = segs[0];
    var status = segs[1];
    var td = "#" + "child_" + status.toLowerCase() + "_count";
    $(".child_count").css("border", "0");
    $(td).css("border", "1px solid black");

    $.getJSON("/describe_job", { job_id: jobId, child_state: status })
      .done(function (obj) {
        updateChildInfo(obj);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  });

  // click on a child job
  $("#array_job_child_table").on('click', ".describe_child_job", function (event) {
    var id = $(event.target).attr('id');

    $.getJSON("/describe_job", { job_id: id })
      .done(function (obj) {
        clearTables();
        populateJobDialog(obj);
        $('#job_dialog').show().scrollTop(0);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });

  });

  // return to parent job
  $("#displaying_child_job").on('click', "#return_to_parent_job", function (event) {
    var id = $("#dialog_job_id").html();
    var segs = id.split(":");
    var jobId = segs[0];

    $.getJSON("/describe_job", { job_id: jobId })
      .done(function (obj) {
        clearTables();
        populateJobDialog(obj);
        $('#job_dialog').show().scrollTop(0);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  });



  // click event handler for tables

  // click event handler for queue table
  $('#queue_summary_table').on('click', '.queue', function (event) {
    clearTables();
    var id = $(event.target).attr('id');
    $.getJSON("/describe_queue", { queue_name: id })
      .done(function (obj) {
        console.log("JSON Data: " + obj);
        console.log("State is " + obj['state']);
        //alert(json);
        populateQueueDialog(obj);
        // alert(JSON.stringify(obj));
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  }); // end of click event handler for queues

  // click reload button for queues table
  $('#reload_queue_table').on('click', function (event) {
    queueTable.ajax.reload();
  })

  // click reload button for envs table
  $('#reload_env_table').on('click', function (event) {
    envTable.ajax.reload();
  })


  // click reload button for jobs table
  $('#reload_job_table').on('click', function (event) {
    jobTable.ajax.reload();
  })


  // listen for draw event on queue table so we can grab distinct queue names
  $("#queue_summary_table").on('draw.dt', function (event) {
    $("#queue_filter").empty();
    $("#queue_filter").append("<option>No Filter</option>");
    var data = queueTable.rows().data();
    for (var i = 0; i < data.length; i++) {
      $("#queue_filter").append("<option>" + data[i][0] + "</option>");
    }

  })

  // click event handler for compute environment table
  $('#comp_env_table').on('click', '.compute_environment', function (event) {
    console.log("in click handler for compute environment");
    clearTables();
    var id = $(event.target).attr('id');
    $.getJSON("/describe_env", { env_name: id })
      .done(function (obj) {
        // console.log( "JSON Data: " +obj );
        // console.log(JSON.stringify(obj));
        populateEnvDialog(obj);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  }); // end of click event handler for compute environment table



  // click event handler for job table
  $('#job_table').on('click', '.job_id', function (event) {
    console.log("in click handler for job table");
    clearTables();
    var id = $(event.target).attr('id');
    $.getJSON("/describe_job", { job_id: id })
      .done(function (obj) {
        // console.log( "JSON Data: " +obj );
        // console.log(JSON.stringify(obj));
        populateJobDialog(obj);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  }); // end of click event handler for job table


  // click event handler for job definition table
  $('#job_def_table').on('click', '.jobdef', function (event) {
    console.log("in click handler for job definition table");
    clearTables();
    var id = $(event.target).attr('id');
    $.getJSON("/describe_job_definition", { jobdef_id: id })
      .done(function (obj) {
        populateJobDefDialog(obj);
      })
      .fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Request Failed: " + err);
      });
  }); // end of click event handler for job definition table



  var populateQueueDialog = function (obj) {
    $("#dialog_queue_header").html("Queue " + obj['jobQueueName']);
    $("#dialog_queue_name").html(obj['jobQueueName']);
    $("#dialog_queue_state").html(obj['state']);
    $("#dialog_queue_priority").html(obj['priority']);
    for (i in obj['computeEnvironmentOrder']) {
      var row = obj['computeEnvironmentOrder'][i];
      var segs = row['computeEnvironment'].split('/');
      var ceName = segs[segs.length - 1];
      var html = "<tr><td>" + row['order'] + " </td><td>" + ceName + "</td></tr>\n";
      // FIXME what about making this a DataTable and appending data to it instead
      // of appending html?
      $("#dialog_queue_env_table").append(html);
    }
    $("#queue_dialog").modal();
  }

  var populateEnvDialog = function (obj) {
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

  var updateChildInfo = function (obj) {
    var summary = obj['arrayProperties']['statusSummary'];
    states.map(function (state) {
      var selector = "#child_" + state.toLowerCase() + "_count";
      var htmlStr = '<a class="child_status" id="' + obj['jobId'] + '_' + state + '">';
      htmlStr += summary[state] + "</a>"
      $(selector).html(htmlStr);
    });
    //array_job_child_table
    $("#array_job_child_table").find("tr:gt(0)").remove();
    obj['childrenForStatus'].map(function (child) {
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

  var populateJobDialog = function (obj) {
    // job status
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
    if (obj.hasOwnProperty('statusReason')) {
      $("#dialog_job_status_reason").html(obj['statusReason']);
    }
    if (obj['container'].hasOwnProperty('reason')) {
      $("#dialog_job_container_message").html(obj['container'['reason']]);
    }
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
      obj['dependsOn'].map(function (item) {
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
    obj['attempts'].map(function (item, index) {
      var html = "<tr>\n";
      html += "<td>" + (index + 1) + "of " + obj['attempts'].length + "</td>\n";
      console.log("lsn = " + item['container']['logStreamName']);
      html += "<td><a target='_blank' href='/job_log?jobId=" + obj['jobId'] + "&attempt=" + index + "'>View logs</a></td>\n";
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
    obj['container']['environment'].map(function (item) {
      var html = "<tr>\n";
      html += "<td align='right'><b>" + item['name'] + "</b></td>\n";
      html += "<td align='left' class='breakMe'>" + item['value'] + "</td>\n";
      html += "</tr>\n"
      $("#dialog_job_envvars").append(html);
    });

    // parameters
    for (var key in obj['parameters']) {
      var value = obj['parameters'][key];
      var html = "<tr>\n";
      html += "<td align='right'><b>" + key + "</b></td>\n";
      html += "<td align='left' class='breakMe'>" + value + "</td>\n";
      html += "</tr>\n"
      $("#dialog_job_parameters").append(html);
    }

    //ulimits
    obj['container']['ulimits'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['name'] + "</td>\n";
      html += "<td>" + item['softLimit'] + "</td>\n";
      html += "<td>" + item['hardLimit'] + "</td>\n";
      html += "</tr>\n";
      $("#dialog_job_ulimits").append(html);
    });

    //volumes
    obj['container']['volumes'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['name'] + "</td>\n";
      html += "<td>" + item['host']['sourcePath'] + "</td>\n";
      html += "</tr>\n";
      $("#dialog_job_volumes").append(html);
    });

    //mount points
    obj['container']['mountPoints'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['containerPath'] + "</td>\n";
      html += "<td>" + item['sourceVolume'] + "</td>\n";
      html += "<td>" + item['readOnly'] + "</td>\n";
      $("#dialog_job_mountpoints").append(html);
    });

    if (obj['container'].hasOwnProperty('logStreamName')) {
      var attempt = obj['attempts'].length - 1;
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


  var populateJobDefDialog = function (obj) {
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
      obj['retryStrategy'] = { attempts: 1 };
    }
    $("#dialog_jobdef_attempts").html(obj['retryStrategy']['attempts']);


    // parameters
    for (var key in obj['parameters']) {
      var value = obj['parameters'][key];
      var html = "<tr>\n";
      html += "<td align='right'><b>" + key + "</b></td>\n";
      html += "<td align='left' class='breakMe'>" + value + "</td>\n";
      html += "</tr>\n"
      $("#dialog_jobdef_parameters").append(html);
    }

    // environment variables
    containerProperties['environment'].map(function item() {
      var html = "<tr>\n";
      html += "<td align='right'><b>" + item['name'] + "</b></td>\n";
      html += "<td align='left' class='breakMe'>" + item['value'] + "</td>\n";
      html += "</tr>\n"
      $("#dialog_jobdef_envvars").append(html);
    });


    //ulimits
    containerProperties['ulimits'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['name'] + "</td>\n";
      html += "<td>" + item['softLimit'] + "</td>\n";
      html += "<td>" + item['hardLimit'] + "</td>\n";
      html += "</tr>\n";
      $("#dialog_jobdef_ulimits").append(html);
    });


    //volumes
    containerProperties['volumes'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['name'] + "</td>\n";
      html += "<td>" + item['host']['sourcePath'] + "</td>\n";
      html += "</tr>\n";
      $("#dialog_jobdef_volumes").append(html);
    });

    //mount points
    containerProperties['mountPoints'].map(function (item) {
      var html = "<tr>\n";
      html += "<td>" + item['containerPath'] + "</td>\n";
      html += "<td>" + item['sourceVolume'] + "</td>\n";
      html += "<td>" + item['readOnly'] + "</td>\n";
      $("#dialog_jobdef_mountpoints").append(html);
    });

    $("#jobdef_dialog").modal();


  }

});
