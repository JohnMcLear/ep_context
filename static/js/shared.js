var supportedContexts = [];
var contexts = require('./contexts').contexts;

for (var context in contexts){
  supportedContexts.push("context" + context);
  supportedContexts.push("contextfirst" + context);
  supportedContexts.push("contextlast" + context);
  supportedContexts.push(context);
  supportedContexts.push("first" + context);
  supportedContexts.push("last" + context);
}

exports.collectContentPre = function(hook, context){
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes
  if(tname === "div" || tname === "p"){
    delete lineAttributes['context'];
  }
  // Works for lines
  if(supportedContexts.indexOf(tname) !== -1){
    lineAttributes['context'] = tname;
  }else{
    // Works for spans
    // I get a bit fucked up sometimes..  Meth is bad..
    if(tname.indexOf("context") === 0){
      var ctname = tname.substring(7,tname.length);

      // Process first and last items from metacontexts down to contexts
      if(ctname.indexOf("last") === 0){
        ctname = ctname.substring(4, ctname.length);
      }
      if(ctname.indexOf("first") === 0){
        ctname = ctname.substring(5, ctname.length);
      }
      // For some reason I don't understand this is required, we can't use the local objects any more..  Scope issue?
      var styles = clientVars.plugins.plugins.ep_context.styles;
      if(styles[ctname] !== -1){
        context.cc.doAttrib(context.state, "context:"+ctname);
      }
    }
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
