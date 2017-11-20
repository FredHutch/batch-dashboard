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





// Person object
var Person = function(data, dt) {
this.id    = data.id;
this.first = ko.observable(data.first);
this.last  = ko.observable(data.last);
this.age   = ko.observable(data.age);
this.full  = ko.computed(function() {
    return this.first() + " " + this.last();
}, this);




// Subscribe a listener to the observable properties for the table
// and invalidate the DataTables row when they change so it will redraw
var that = this;
$.each( [ 'first', 'last', 'age' ], function (i, prop) {
that[ prop ].subscribe( function (val) {
  // Find the row in the DataTable and invalidate it, which will
  // cause DataTables to re-read the data
  var rowIdx = dt.column( 0 ).data().indexOf( that.id );
  dt.row( rowIdx ).invalidate();
} );
} );
};


var ComputeEnvironment = function(data, dt) {
  this.name = ko.observable(data.name);
  this.type = ko.observable(data.type);
  this.minvCpus = ko.observable(data.minvCpus);
  this.desiredvCpus = ko.observable(data.desiredvCpus);
  this.maxvCpus = ko.observable(data.maxvCpus);





  // Subscribe a listener to the observable properties for the table
  // and invalidate the DataTables row when they change so it will redraw
  var that = this;
  $.each( [ 'name', 'type', 'minvCpus', 'desiredvCpus', 'maxvCpus'], function (i, prop) {
  that[ prop ].subscribe( function (val) {
    // Find the row in the DataTable and invalidate it, which will
    // cause DataTables to re-read the data
    console.log('wtf is name? ' + that.name());
    var rowIdx = dt.column( 0 ).data().indexOf( that.name() );
    dt.row( rowIdx ).invalidate();
  } );
  } );
  };




// Initial data set
var data = [
{ id: 0, first: "Allan", last: "Jardine", age: 86 },
{ id: 1, first: "Bob", last: "Smith", age: 54 },
{ id: 2, first: "Jimmy", last: "Jones", age: 32 }
];

var data0 = [
  {name: 'foo', type: 'fooey', minvCpus: 0, desiredvCpus: 1, maxvCpus: 2}
];


$(document).ready(function() {
var people = ko.mapping.fromJS( [] );
var envs = ko.mapping.fromJS( [] );
var dt = $('#example').DataTable( {
columns: [
  { data: 'id' },
  { data: 'first()' },
  { data: 'age()' }
]
} );


var envTable = $("#comp_env_table").DataTable( {
  columns: [
    {data: 'name()'},
    {data: 'type()'},
    {data: 'minvCpus()'},
    {data: 'desiredvCpus()'},
    {data: 'maxvCpus()'}
  ]
});


// Update the table when the `people` array has items added or removed
people.subscribeArrayChanged(
function ( addedItem ) {
  dt.row.add( addedItem ).draw();
},
function ( deletedItem ) {
  var rowIdx = dt.column( 0 ).data().indexOf( deletedItem.id );
  dt.row( rowIdx ).remove().draw();
}
);

envs.subscribeArrayChanged(
function ( addedItem ) {
  console.log('in subscribeArrayChanged.addedItem ');
  console.log(addedItem);
  envTable.row.add( addedItem ).draw();
},
function ( deletedItem ) {
  console.log('in subscribeArrayChanged.deletedItem ');
  console.log(deletedItem.name());
  // debugger;
  var rowIdx = envTable.column( 0 ).data().indexOf( deletedItem.name() );
  console.log("rowIdx is " + rowIdx);
  envTable.row( rowIdx ).remove().draw();
}
);


// Convert the data set into observable objects, and will also add the
// initial data to the table
ko.mapping.fromJS(
data,
{
  key: function(data) {
    return ko.utils.unwrapObservable(data.id);
  },
  create: function(options) {
    return new Person(options.data, dt);
  }
},
people
);


ko.mapping.fromJS(
data0,
{
  key: function(data) {
    console.log("data are ");
    console.log(data);
    return ko.utils.unwrapObservable(data.name);
  },
  create: function(options) {
    console.log('here are options');
    console.log(options);
    return new ComputeEnvironment(options.data, envTable);
  }
},
envs
);





// Examples:

// Update a field
console.log("Changed Allan to Allan3");
people()[0].first( 'Allan3' );

// Add an item
console.log("adding a person");
people.push( new Person( {
id: 3,
first: "John",
last: "Smith",
age: 34
}, dt ) );

// Remove an item
// people.shift();

people()[0].first('dang');


envs()[0].name('plappppe');
console.log(envs()[0].name());
envs.push(new ComputeEnvironment({ // works!
name: 'newy',
type: 'haha',
minvCpus: 21,
desiredvCpus: 22,
maxvCpus: 23
}, envTable));

console.log("-----------");

envs.shift();

} );
