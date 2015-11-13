// var supportedContexts = ["contextsection", "contextparagraph", "contextsubsection", "contextform", "contextdistribution-code", "contextcongress", "contextsession", "contextheader", "contextenum"];
var supportedContexts = ["contextsponsor", "contexttitle", "contextwhereas", "contextresolved", "contextsignature", "contextdate", "contextlastwhereas", "contextlastresolved", "contextfirstresolved"];

exports.collectContentPre = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes
  if(tname === "div" || tname === "p"){
    delete lineAttributes['context'];
  }
  if(supportedContexts.indexOf(tname) !== -1){
    lineAttributes['context'] = tname;
  }

  // Probably not needed
  // lineAttributes['lastlinebutton'] = true;
};

exports.collectContentPost = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes;
  if(supportedContexts.indexOf(tname) !== -1){
    delete lineAttributes['context'];
  }

  // Probably not needed
  // lineAttributes['lastlinebutton'] = true;

};
