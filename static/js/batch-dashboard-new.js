// Helper function so we know what has changed
// http://stackoverflow.com/questions/12166982
ko.observableArray.fn.subscribeArrayChanged = function(addCallback, deleteCallback) {
  var previousValue = undefined;
  this.subscribe(function(_previousValue) {
    previousValue = _previousValue.slice(0);
  }, undefined, 'beforeChange');
  this.subscribe(function(latestValue) {
    var editScript = ko.utils.compareArrays(previousValue, latestValue);
    for (var i = 0, j = editScript.length; i < j; i++) {
      switch (editScript[i].status) {
        case "retained":
          break;
        case "deleted":
          if (deleteCallback)
            deleteCallback(editScript[i].value);
          break;
        case "added":
          if (addCallback)
            addCallback(editScript[i].value);
          break;
      }
    }
    previousValue = undefined;
  });
};

ko.unapplyBindings = function ($node, remove) {
    // unbind events
    $node.find("*").each(function () {
        $(this).unbind();
    });

    // Remove KO subscriptions and references
    if (remove) {
        ko.removeNode($node[0]);
    } else {
        ko.cleanNode($node[0]);
    }
};


var getUnique = function(inputArray)
{
	var outputArray = [];
	for (var i = 0; i < inputArray.length; i++)
	{
		if ((jQuery.inArray(inputArray[i], outputArray)) == -1)
		{
			outputArray.push(inputArray[i]);
		}
	}
	return outputArray;
}

var reloadComputeEnvironmentTable = function(envs, envTable) {
  $.getJSON('/describe_envs').done(function(data) {
    fullListOfEnvironments = data;
    ko.mapping.fromJS(
      fullListOfEnvironments, {
        key: function(data) {
          return ko.utils.unwrapObservable(data.computeEnvironmentName); // ??
        },
        create: function(options) {
          return new ComputeEnvironment({
            computeEnvironmentName: options.data.computeEnvironmentName,
            type: options.data.type,
            minvCpus: options.data.computeResources.minvCpus,
            desiredvCpus: options.data.computeResources.desiredvCpus,
            maxvCpus: options.data.computeResources.maxvCpus
          }, envTable);
        }
      },
      envs
    );
  });

}

//

var reloadJobDefinitionTable = function(defs, defTable) {
  $.getJSON('/describe_job_definitions').done(function(data) {
    fullListOfJobDefinitions = data;
    fullListOfJobDefinitions = fullListOfJobDefinitions.map(function(x, index) {
      if (!x.hasOwnProperty('retryStrategy')) {
          x['retryStrategy'] = {attempts: 1};
      }
      return x;
  });
    ko.mapping.fromJS(
      fullListOfJobDefinitions, {
        key: function(data) {
          return ko.utils.unwrapObservable(data.jobDefinitionName) + ":" + ko.utils.unwrapObservable(data.revision); // ??
        },
        create: function(options) {
          return new JobDefinition({
            jobDefinitionName: options.data.jobDefinitionName,
            revision: options.data.revision,
            vcpus: options.data.containerProperties.vcpus,
            memory: options.data.containerProperties.memory,
            image: options.data.containerProperties.image
        }, defTable);
        }
      },
      defs
    );
  });
}


var reloadJobTable = function(jobs, jobTable) {
  $.getJSON('/get_jobs').done(function(data) {
    fullListOfJobs = data;

    queues = ko.observableArray(getUnique(fullListOfJobs.map(function(x) {return x.jobQueue.split("/").pop()})).sort());
    ko.applyBindings(queues, $("#queue_filter")[0]); // dante

    statuses = ko.observableArray(states);
    ko.applyBindings(statuses, $("#state_filter")[0]);

    ko.mapping.fromJS(
      fullListOfJobs, {
        key: function(data) {
          return ko.utils.unwrapObservable(data.jobId);
        },
        create: function(options) {
          return new Job({
            jobId: options.data.jobId,
            jobQueue: options.data.jobQueue.split("/").pop(),
            createdAt: options.data.createdAt,
            jobName: options.data.jobName,
            status: options.data.status
        }, jobTable);
        }
      },
      jobs
    );
  });
}



// Person object
var Person = function(data, dt) {
  this.id = data.id;
  this.first = ko.observable(data.first);
  this.last = ko.observable(data.last);
  this.age = ko.observable(data.age);
  this.full = ko.computed(function() {
    return this.first() + " " + this.last();
  }, this);




  // Subscribe a listener to the observable properties for the table
  // and invalidate the DataTables row when they change so it will redraw
  var that = this;
  $.each(['first', 'last', 'age'], function(i, prop) {
    that[prop].subscribe(function(val) {
      // Find the row in the DataTable and invalidate it, which will
      // cause DataTables to re-read the data
      var rowIdx = dt.column(0).data().indexOf(that.id);
      dt.row(rowIdx).invalidate();
    });
  });
};


var ComputeEnvironment = function(data, dt) {
  this.computeEnvironmentName = ko.observable(data.computeEnvironmentName);
  this.type = ko.observable(data.type);
  this.minvCpus = ko.observable(data.minvCpus);
  this.desiredvCpus = ko.observable(data.desiredvCpus);
  this.maxvCpus = ko.observable(data.maxvCpus);





  // Subscribe a listener to the observable properties for the table
  // and invalidate the DataTables row when they change so it will redraw
  var that = this;
  $.each(['computeEnvironmentName', 'type', 'minvCpus', 'desiredvCpus', 'maxvCpus'], function(i, prop) {
    that[prop].subscribe(function(val) {
      // Find the row in the DataTable and invalidate it, which will
      // cause DataTables to re-read the data
      var rowIdx = dt.column(0).data().indexOf(that.computeEnvironmentName());
      dt.row(rowIdx).invalidate();
    });
  });
};


var JobDefinition = function(data, dt) {
  this.jobDefinitionName = ko.observable(data.jobDefinitionName);
  this.revision = ko.observable(data.revision);
  this.vcpus = ko.observable(data.vcpus);
  this.memory = ko.observable(data.memory);
  this.image = ko.observable(data.image);

  // Subscribe a listener to the observable properties for the table
  // and invalidate the DataTables row when they change so it will redraw
  var that = this;
  $.each(['jobDefinitionName', 'revision', 'vcpus', 'memory', 'image'], function(i, prop) {
    that[prop].subscribe(function(val) {
      // Find the row in the DataTable and invalidate it, which will
      // cause DataTables to re-read the data
      var rowIdx = dt.column(0).data().indexOf(that.jobDefinitionName());
      dt.row(rowIdx).invalidate();
    });
  });
};



var Job = function(data, dt) {
  this.jobId = ko.observable(data.jobId);
  this.jobName = ko.observable(data.jobName);
  this.status = ko.observable(data.status);
  this.jobQueue = ko.observable(data.jobQueue);
  this.createdAt = ko.observable(data.createdAt);

  // Subscribe a listener to the observable properties for the table
  // and invalidate the DataTables row when they change so it will redraw
  var that = this;
  $.each(['jobId', 'jobName', 'status', 'jobQueue', 'createdAt'], function(i, prop) {
    that[prop].subscribe(function(val) {
      // Find the row in the DataTable and invalidate it, which will
      // cause DataTables to re-read the data
      var rowIdx = dt.column(0).data().indexOf(that.jobId());
      dt.row(rowIdx).invalidate();
    });
  });
};



// "global" variables

var fullListOfEnvironments = [];
var fullListOfJobDefinitions = [];
var fullListOfJobs = [];
var states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
          'RUNNING', 'FAILED', 'SUCCEEDED'];
var queues;
var statuses;

// Initial data set
var data = [{
    id: 0,
    first: "Allan",
    last: "Jardine",
    age: 86
  },
  {
    id: 1,
    first: "Bob",
    last: "Smith",
    age: 54
  },
  {
    id: 2,
    first: "Jimmy",
    last: "Jones",
    age: 32
  }
];



$(document).ready(function() {

  // initial mappings
  var people = ko.mapping.fromJS([]);
  var envs = ko.mapping.fromJS([]);
  var defs = ko.mapping.fromJS([]);
  var jobs = ko.mapping.fromJS([]);


  // dataTables
  var dt = $('#example').DataTable({
    columns: [{
        data: 'id'
      },
      {
        data: 'first()'
      },
      {
        data: 'age()'
      }
    ]
  });


  var envTable = $("#comp_env_table").DataTable({
    columns: [{
        data: 'computeEnvironmentName()'
      },
      {
        data: 'type()'
      },
      {
        data: 'minvCpus()'
      },
      {
        data: 'desiredvCpus()'
      },
      {
        data: 'maxvCpus()'
      }
    ],
    columnDefs: [{
      "render": function(data, type, row) {
        return '<a class="compute_environment" id="' + data + '">' + data + '</a>';
      },
      "targets": 0
    }]
  });

  var jobDefTable = $("#job_def_table").DataTable({
     columns: [{
             data: 'jobDefinitionName()'
         },
         {
             data: 'revision()'
         },
         {
             data: 'vcpus()'
         },
         {
             data: 'memory()'
         },
         {
             data: 'image()'
         }
     ],
     columnDefs: [{
         "render": function(data, type, row) {
           return '<a class="jobdef" id="' + data + ':' + row.revision() + '">' + data + '</a>';
         },
         "targets": 0

     }]
  });

  var jobTable = $("#job_table").DataTable({
      dom: 'Bfrtip',
      buttons: [
          {
              extend: 'copyHtml5',
              title: null,
              text: 'Copy to clipboard'
          }
      ],
     columns: [
       {
         data: 'jobQueue()'
       },
       {
         data: 'createdAt()'
       },
       {
         data: 'jobId()'
       },
       {
         data: 'jobName()'
       },
       {
         data: 'status()'
       }
   ],
   columnDefs: [
     {
       "render": function(data, type, row) {
         return '<a class="job_id" id="' + data + '">' + data + '</a>';
       },
       "targets": 2
     },
     {
         "render": function(data, type, row) {
             return new Date(data);
         },
         "targets": 1
     }
   ]
  });

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


  //subscribe models to arrayChanged

  // Update the table when the `people` array has items added or removed
  people.subscribeArrayChanged(
    function(addedItem) {
      dt.row.add(addedItem).draw();
    },
    function(deletedItem) {
      var rowIdx = dt.column(0).data().indexOf(deletedItem.id);
      dt.row(rowIdx).remove().draw();
    }
  );

  envs.subscribeArrayChanged(
    function(addedItem) {
      envTable.row.add(addedItem).draw();
    },
    function(deletedItem) {
      var rowIdx = envTable.column(0).data().indexOf(deletedItem.computeEnvironmentName());
      envTable.row(rowIdx).remove().draw();
    }
  );

  defs.subscribeArrayChanged(
    function(addedItem) {
      jobDefTable.row.add(addedItem).draw();
    },
    function(deletedItem) {
      //FIXME does not take into account compound key!
      // does it matter? this table will never change dynamically....
      var rowIdx = jobDefTable.column(0).data().indexOf(deletedItem.jobDefinitionName());
      envTable.row(rowIdx).remove().draw();
    }
  );


  jobs.subscribeArrayChanged(
    function(addedItem) {
      jobTable.row.add(addedItem).draw();
    },
    function(deletedItem) {
      var rowIdx = jobTable.column(0).data().indexOf(deletedItem.jobId());
      jobTable.row(rowIdx).remove().draw();
    }
  );



  // Convert the data set into observable objects, and will also add the
  // initial data to the table
  ko.mapping.fromJS(
    data, {
      key: function(data) {
        return ko.utils.unwrapObservable(data.id);
      },
      create: function(options) {
        return new Person(options.data, dt);
      }
    },
    people
  );



  // reload event listeners
  $("#reload-compute-environments").click(function() {
    reloadComputeEnvironmentTable(envs, envTable);
  });

  $("#reload-job-definitions").click(function() {
    reloadJobDefinitionTable(defs, jobDefTable);
  });

  $("#reload-jobs").click(function() {
    reloadJobTable(jobs, jobTable);
  });


// click listeners (for links in tables)

$('#comp_env_table').on( 'click', '.compute_environment', function (event) {

  var id = $(event.target).attr('id');
  var compEnv = $.grep(fullListOfEnvironments, function(e){return e.computeEnvironmentName == id;})[0];
  /*
  What follows is a sort of hacky way to make sure that dialogs don't have old cruft
  in them (from opening the same dialog on a different data model).
  So we copy the HTML of the dialog into a new div, give it a unique ID, and then
  bind the knockout data into it. I am sure there is a better way, perhaps
  at http://aboutcode.net/2012/11/15/twitter-bootstrap-modals-and-knockoutjs.html
  but that requires you to jump through hoops before seeing the code.
  */

  var html = $("#env_dialog_holder").html();
  var modal_id = "comp_env_modal_" + Date.now();
  html = html.replace("REPLACE_ME", modal_id);
  $("#env_dialog_displayer").html(html);
  var elementToBind = $("#" + modal_id)[0];

  var viewModel = ko.mapping.fromJS(compEnv);
  ko.applyBindings(viewModel, elementToBind);

  $("#" + modal_id).modal();
});


//



$('#job_def_table').on( 'click', '.jobdef', function (event) {

  var id = $(event.target).attr('id');
  var segs = id.split(":");
  var jobDefName = segs[0]
  var revision = parseInt(segs[1]);
  var jobDef = $.grep(fullListOfJobDefinitions, function(e){return e.jobDefinitionName == jobDefName && e.revision == revision ;})[0];
  /*
  What follows is a sort of hacky way to make sure that dialogs don't have old cruft
  in them (from opening the same dialog on a different data model).
  So we copy the HTML of the dialog into a new div, give it a unique ID, and then
  bind the knockout data into it. I am sure there is a better way, perhaps
  at http://aboutcode.net/2012/11/15/twitter-bootstrap-modals-and-knockoutjs.html
  but that requires you to jump through hoops before seeing the code.
  */

  var html = $("#jobdef_dialog_holder").html();
  var modal_id = "job_def_modal_" + Date.now();
  html = html.replace("REPLACE_ME", modal_id);
  $("#jobdef_dialog_displayer").html(html);
  var elementToBind = $("#" + modal_id)[0];

  var viewModel = ko.mapping.fromJS(jobDef);
  ko.applyBindings(viewModel, elementToBind);

  $("#" + modal_id).modal();
});

//

$('#job_table').on( 'click', '.job_id', function (event) {

  var id = $(event.target).attr('id');
  /*
  What follows is a sort of hacky way to make sure that dialogs don't have old cruft
  in them (from opening the same dialog on a different data model).
  So we copy the HTML of the dialog into a new div, give it a unique ID, and then
  bind the knockout data into it. I am sure there is a better way, perhaps
  at http://aboutcode.net/2012/11/15/twitter-bootstrap-modals-and-knockoutjs.html
  but that requires you to jump through hoops before seeing the code.
  */

  var html = $("#job_dialog_holder").html();
  var modal_id = "job_modal_" + Date.now();
  html = html.replace("REPLACE_ME", modal_id);
  $("#job_dialog_displayer").html(html);
  var elementToBind = $("#" + modal_id)[0];
  var job = $.grep(fullListOfJobs, function(e){return e.jobId == id;})[0];
  job.createdAt = new Date(job.createdAt);
  job.startedAt = new Date(job.startedAt);
  job.attempts.map(function(x, i){
     job['attempts'][i]['startedAt'] = new Date(x['startedAt']);
     job['attempts'][i]['stoppedAt'] = new Date(x['stoppedAt']);
     job['attempts'][i]['logLink'] = '/job_log?jobId=' + job['jobId'] + '&attempt=' + i;
  });
  job.jobQueue = job.jobQueue.split("/").pop();
  job.isRunning = job.status == 'RUNNING';
  job.notRunning = !job.isRunning;
  var attempt = job['attempts'].length;
  var jobId = job['jobId'];
  job.logLink = '/job_log?jobId=' + jobId + '&attempt=' + attempt;
  console.log('attempt = ' + attempt + ', jobId = ' + jobId + ', isRunning = ' + job.isRunning + ', notRunning = ' + job.notRunning);
  var viewModel = ko.mapping.fromJS(job);
  ko.applyBindings(viewModel, elementToBind);

  $("#" + modal_id).modal();
});




  // Examples:

  // Update a field
  // people()[0].first('Allan3');

  // Add an item
  // people.push(new Person({
  //   id: 3,
  //   first: "John",
  //   last: "Smith",
  //   age: 34
  // }, dt));
  //
  // // Remove an item
  // people.shift();

  // people()[0].first('dang');


  // envs()[0].computeEnvironmentName('plappppe');
  // envs.push(new ComputeEnvironment({ // works!
  // computeEnvironmentName: 'newy',
  // type: 'haha',
  // minvCpus: 21,
  // desiredvCpus: 22,
  // maxvCpus: 23
  // }, envTable));


  // envs.shift();

  reloadComputeEnvironmentTable(envs, envTable);
  reloadJobDefinitionTable(defs, jobDefTable);
  reloadJobTable(jobs, jobTable);


});
