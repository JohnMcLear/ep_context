var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

/*****
* Basic setup
******/

// Bind the event handler to the toolbar buttons
exports.postAceInit = function(hook, context){
  $('#context-selection').change(function(contextValue){
    var newValue = $('#context-selection').val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);
  });
};

// Show the subscript button as depressed when subscript is active 
// at the caret location
// TODO: create a postAceEditEvent hook that is fired once ace events
// have been fully processed by the content collector.
exports.aceEditEvent = function(hook, call, cb){
  // If it's not a click or a key event and the text hasn't changed then do nothing
  var cs = call.callstack;
  if(!(cs.type == "handleClick") && !(cs.type == "handleKeyEvent") && !(cs.docTextChanged)){
    return false;
  }
  // If it's an initial setup event then do nothing..
  if(cs.type == "setBaseText" || cs.type == "setup") return false;

  // It looks like we should check to see if this section has this attribute
  setTimeout(function(){ // avoid race condition..

    // Attribtes are never available on the first X caret position so we need to ignore that
    if(call.rep.selStart[1] === 0){
      // Attributes are never on the first line
      $('.subscript > a').removeClass('activeButton');
      return;
    }

    // the caret is in a new position..  Let's do some funky shit
    if ( call.editorInfo.ace_getAttributeOnSelection("sub") ) {
      // show the button as being depressed..  Not sad, but active..
      $('.subscript > a').addClass('activeButton');
    }else{
      $('.subscript > a').removeClass('activeButton');
    }

    // Attribtes are never available on the first X caret position so we need to ignore that
    if(call.rep.selStart[1] === 0){
      // Attributes are never on the first line
      $('.superscript > a').removeClass('activeButton');
      return;
    }

    // the caret is in a new position..  Let's do some funky shit
    if ( call.editorInfo.ace_getAttributeOnSelection("sup") ) {
      // show the button as being depressed..  Not sad, but active..
      $('.superscript > a').addClass('activeButton');
    }else{
      $('.superscript > a').removeClass('activeButton');
    }

  },250);
}

/*****
* Editor setup
******/

// Our sup/subscript attribute will result in a class
// I'm not sure if this is actually required..
exports.aceAttribsToClasses = function(hook, context){
  if(context.key == 'context'){
    // console.warn(context);
    return ["context:"+context.value];
  }
}

// Block elements
// I'm not sure if this is actually required..
// Prevents character walking
exports.aceRegisterBlockElements = function(){
  return ["contextsection", "contextparagraph", "contextsubsection"];
}

// Find out which lines are selected and assign them the context attribute.
// Passing a level >= 0 will set a context on the selected lines, level < 0 
// will remove it
function doContext(level){
  var rep = this.rep;
  var documentAttributeManager = this.documentAttributeManager;
  var firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each(function(i){
    // Does range already have attribute?
    var attributes = documentAttributeManager.getAttributeOnLine(i, 'context');

    if(level === "dummy"){
      console.warn("removing attribute");
      // take last attribute from attributes, split it
      var split = attributes.split("$");
      // remove it and recreate new string
      attributes = split.slice(0, split.length - 2).join("$") + "$";
    }

    if(level !== "dummy"){
      if(attributes){
        attributes = attributes + "$" + level
      }else{
        attributes = level;
      }
    }

    documentAttributeManager.setAttributeOnLine(i, 'context', attributes);
  });
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doContext = _(doContext).bind(context);
}

// Here we convert the class context:h1 into a tag
exports.aceDomLineProcessLineAttributes = function(name, context){
  var contexts = /context:(.*?) /i.exec(context.cls);
  var tags = contexts[1];
  tags = tags.split("$");
  var preHtml = "";
  var postHtml = "";
  $.each(tags, function(i, tag){
    preHtml += '<context' + tag + '>'
    postHtml += '</context' + tag + '>'
  });
  var modifier = {
    preHtml: preHtml,
    postHtml: postHtml,
    processedMarker: true
  };
  return [modifier];
};
