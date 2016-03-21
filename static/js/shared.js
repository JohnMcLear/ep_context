var supportedContexts = [];
var contexts = require('./contexts').contexts;

for (var context in contexts){
  supportedContexts.push("context" + context);
  supportedContexts.push("contextfirst" + context);
  supportedContexts.push("contextlast" + context);
}

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

  // Added to support Spans -- May be some drama related nonsense here
  var level = /(?:^| )(context:[A-Za-z0-9]*)/.exec(context.cls);
  if(level){
    level = level[0].split(":")[1];
    context.cc.doAttrib(context.state, "context:" + level);
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
