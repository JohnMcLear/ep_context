exports.collectContentPre = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes
  var tagIndex = tname;
  // console.warn("tname", tname);
  var supportedContexts = ["contextsection", "contextparagraph", "contextsubsection"];
  if(supportedContexts.indexOf(tname) !== -1){
    // console.warn("processed tname", tname);
    lineAttributes['context'] = tname;
    context.cc.doAttrib(state, tname);
  }
};

exports.collectContentPost = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes
  // console.warn(tname);
};
