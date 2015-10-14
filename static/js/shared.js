// var supportedContexts = ["contextsection", "contextparagraph", "contextsubsection", "contextform", "contextdistribution-code", "contextcongress", "contextsession", "contextheader", "contextenum"];
var supportedContexts = ["contexttitle", "contextwhereas"];

exports.collectContentPre = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes
  if(tname === "div" || tname === "p"){
    delete lineAttributes['context'];
  }
  if(supportedContexts.indexOf(tname) !== -1){
//    console.warn("processed tname", tname);
    lineAttributes['context'] = tname;
//    if(!state.attribs[state]){
//      context.cc.doAttrib(state, tname);
//    }
  }
};

exports.collectContentPost = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes;
  if(supportedContexts.indexOf(tname) !== -1){
//    console.warn("deleting context", tname);
    delete lineAttributes['context'];
  }
};
