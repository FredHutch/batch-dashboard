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
  console.log("inside reloadComputeEnvironmentTable()... ");
  $.getJSON('/describe_envs').done(function(data) {
    // console.log("we got data! ");
    // console.log(data);
    fullListOfEnvironments = data;
    ko.mapping.fromJS(
      fullListOfEnvironments, {
        key: function(data) {
          console.log("data are ");
          // console.log(data);
          console.log(data.computeEnvironmentName);
          // console.log("unwrapped:");
          console.log(ko.utils.unwrapObservable(data.computeEnvironmentName)); // ??
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


// "global" variables

var fullListOfEnvironments = [];
var compEnvDialogBinding = null;


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

var data0 = [{
  computeEnvironmentName: 'foo',
  type: 'fooey',
  minvCpus: 0,
  desiredvCpus: 1,
  maxvCpus: 2
}];


$(document).ready(function() {

  // initial mappings
  var people = ko.mapping.fromJS([]);
  var envs = ko.mapping.fromJS([]);


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
    console.log("you want to reload the compute environments table, eh?")
    reloadComputeEnvironmentTable(envs, envTable);
  });


// click listeners (for links in tables)

$('#comp_env_table').on( 'click', '.compute_environment', function (event) {
  console.log("in click handler for compute environment");

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



  // Examples:

  // Update a field
  // console.log("Changed Allan to Allan3");
  // people()[0].first('Allan3');

  // Add an item
  // console.log("adding a person");
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
  // console.log(envs()[0].computeEnvironmentName());
  // envs.push(new ComputeEnvironment({ // works!
  // computeEnvironmentName: 'newy',
  // type: 'haha',
  // minvCpus: 21,
  // desiredvCpus: 22,
  // maxvCpus: 23
  // }, envTable));

  // console.log("-----------");

  // envs.shift();

  reloadComputeEnvironmentTable(envs, envTable);



});
