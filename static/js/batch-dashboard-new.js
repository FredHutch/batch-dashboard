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

// TODO: add reloadJobTable()


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

//

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


// TODO: add Job object

// "global" variables

var fullListOfEnvironments = [];
var fullListOfJobDefinitions = [];
var fullListOfJobs = [];

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
     columns: [
       {
         data: 'queue()'
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
    reloadJobDefinitionTable(defs, jobDefTable); //dante
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


});
