var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var styles = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];
var stylesCSS = ["contextparagraph{margin-left:10px;color:green;}",
  "contextform{text-align:center;display:block;}",
  "contextsection > contextheader, contextsection > contextenum{text-align:center;display:block;}",
  "contextenum{font-weight:bolder;}",
  "contextheader{font-weight:bolder;}",
  "contextcongress{font-variant: small-caps;}",
  "contextsession{font-variant: small-caps;}",
  "contextsubsection{margin-left:15px;color:blue;}",
  "contextdistribution-code{text-align:right;display:block;}"]



/*****
* Basic setup
******/

// Bind the event handler to the toolbar buttons
exports.postAceInit = function(hook, context){
  // Setup a crude enter count
  clientVars.plugins.plugins.ep_context.crudeEnterCounter = 0;

  $.each(styles, function(k,v){
    $('#context-selection').append("<option value='"+v+"'>"+v+"</option>");
  });

  // Temporarily bodge some CSS in for debugging
  var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var head = inner.contents().find("head");

  $.each(stylesCSS, function(k,css){
    head.append("<style>"+css+"</style>");
  });

  // Selection event
  $('#context-selection').change(function(contextValue){
    var newValue = $('#context-selection').val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);
  });
};

// Show the active Context
exports.aceEditEvent = function(hook, call, cb){
  // If it's not a click or a key event and the text hasn't changed then do nothing
  var cs = call.callstack;
  var rep = call.rep;
  var documentAttributeManager = call.documentAttributeManager;

  if(!(cs.type == "handleClick") && !(cs.type == "handleKeyEvent") && !(cs.docTextChanged)){
    return false;
  }
  // If it's an initial setup event then do nothing..
  if(cs.type == "setBaseText" || cs.type == "setup") return false;

  // Enter key pressed so new line, I don't think this will support a lot of edge cases IE pasting
  if(cs.docTextChanged === true && cs.domClean === true && cs.repChanged === true && cs.type === "handleKeyEvent"){
    var lastLine = rep.selStart[0]-1;
    var thisLine = rep.selEnd[0];
    var attributes = documentAttributeManager.getAttributeOnLine(lastLine, 'context');
    if(attributes){
      // The line did have attributes so set them on the new line

      // But before we apply a new attribute we should see if we're supposed to be dropping an context layer
      if(clientVars.plugins.plugins.ep_context.crudeEnterCounter >= 1){
        var split = attributes.split("$");
        // remove it and recreate new string
        if(split.length > 1){
          attributes = split.slice(0, split.length - 1).join("$");
          documentAttributeManager.setAttributeOnLine(thisLine, 'context', attributes);
          // remove on previous line too
          documentAttributeManager.setAttributeOnLine(thisLine-1, 'context', attributes);
        }else{
          // no more attributes left so remove it
          documentAttributeManager.removeAttributeOnLine(thisLine, 'context');
          // remove on previous line too
          documentAttributeManager.removeAttributeOnLine(thisLine-1, 'context');
        }
        return true;
      }
      documentAttributeManager.setAttributeOnLine(thisLine, 'context', attributes);
      clientVars.plugins.plugins.ep_context.crudeEnterCounter++;
      return true;
    }
  }

  // It looks like we should check to see if this section has this attribute
  setTimeout(function(){ // avoid race condition..
    getLastContext(call, function(lastContext){
      // Show this context as being enabled.
      $('#context-selection').val(lastContext);
    });
  },250);
}

/*****
* Editor setup
******/

// Our sup/subscript attribute will result in a class
// I'm not sure if this is actually required..
exports.aceAttribsToClasses = function(hook, context){
  if(context.key == 'context'){
    return ["context:"+context.value];
  }
}

// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function(){
  var styleArr = [];
  $.each(styles, function(k,v){
    styleArr.push("context"+v.toLowerCase());
  });
  return styleArr;
}

// When pasting content etc. ensure line attributes are not lost.
exports.collectContentLineText = function(hook, context){
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
    // are attempting to remove a line attribute?
    if(level === "dummy"){
      // take last attribute from attributes, split it
      var split = attributes.split("$");
      // remove it and recreate new string
      attributes = split.slice(0, split.length - 2).join("$");
    }else{
      if(attributes){
        attributes = attributes + "$" + level
      }else{
        attributes = level;
      }
    }
    if(attributes.length > 1){
      documentAttributeManager.setAttributeOnLine(i, 'context', attributes);
    }else{
      documentAttributeManager.removeAttributeOnLine(i, 'context');
    }
  });
}

// Get the context of a line
function getLastContext(context, cb){
  var rep = context.rep;
  var documentAttributeManager = context.documentAttributeManager;
  var firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each(function(i){
    // Does range already have attribute?
    var attributes = documentAttributeManager.getAttributeOnLine(i, 'context');
    // take last attribute from attributes, split it
    var split = attributes.split("$");
    // clean empty values
    split = cleanArray(split);
    var lastContext = split[split.length-1];
    return cb(lastContext);
  });
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doContext = _(doContext).bind(context);
}

// Here we convert the class context:x into a tag
exports.aceDomLineProcessLineAttributes = function(name, context){
  var contexts = /context:(.*?) /i.exec(context.cls);
  if(!contexts) return [];
  var tags = contexts[1];
  tags = tags.split("$");
  var preHtml = "";
  var postHtml = "";
  var processed = false;
  $.each(tags, function(i, tag){
    if(tag.substring(0,7) === "context"){
      // on paste we have the correct context defined so we need to modify it back to the tag
      tag = tag.substring(7,tag.length); // cake
      tag = tag.charAt(0).toUpperCase() + tag.slice(1);
    }
    if(styles.indexOf(tag) !== -1){
      preHtml += '<context' + tag + '>';
      postHtml += '</context' + tag + '>';
      processed = true;
    }
  });
  if(processed){
    var modifier = {
      preHtml: preHtml,
      postHtml: postHtml,
      processedMarker: true
    };
    return [modifier];
  }else{
    return [];
  }
};

function cleanArray(actual){
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
    if (actual[i]){
      newArray.push(actual[i]);
    }
  }
  return newArray;
}

// Handle "Enter" events, this should keep the formatting of the previous line
// If two line breaks are detected then we drop a level of context
// Note that we don't handle return or paste events yet.
// I dropped this in favor of edit events which are called after the DOM is redraw
// so you don't get double line enters as the attributes are atetmpted to be added
// before the DOM is redrawn
exports.aceKeyEvent = function(hook, e){
  if(e.evt.keyCode !== 13){
    clientVars.plugins.plugins.ep_context.crudeEnterCounter = 0;
  }
}
