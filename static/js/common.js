var clearTables = function () {
    $(".dynamicDialogTable").find("tr:gt(0)").remove();
}

Object.defineProperty(String.prototype, 'hashCode', {
  value: function() {
    var hash = 0, i, chr;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
});

var getShortStack = function() {
  var shortStack = [];
  var obj = null;
  if (window.hasOwnProperty("jdStack")) {
    obj = jdStack;
  } else if (window.hasOwnProperty("jobStack")) {
    obj = jobStack;
  } else {
    console.log("oops");
  }
  for (var i = 0;i < obj.length; i++) {
    shortStack.push(obj[i].hashCode());
  }
  return shortStack;
}
