var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padEditor;

var styles = [];
var allContextKeys = [];
var lastLineContexts = [];
var contextStrings = []; // Used for Copy/pasting
var contextStartStrings = {}; // Used for locating which string starts with a given value

contexts = contexts.context;

// Setup the relevant lookup objects, one time operation
$.each(contexts, function(key, context){
  if(context.first && context.first.before) contextStrings.push(context.first.before.content);
  if(context.second && context.second.before) contextStrings.push(context.second.before.content);
  if(context.before && context.before) contextStrings.push(context.before.content);
  if(context.beforelast && context.beforelast.before) contextStrings.push(context.beforelast.before.content);
  if(context.last && context.last.before) contextStrings.push(context.last.before.content);

  contextStartStrings[key] = [];
  if(context.first && context.first.before) contextStartStrings[key].push(context.first.before.content);
  if(context.second && context.second.before) contextStartStrings[key].push(context.second.before.content);
  if(context.before && context.before) contextStartStrings[key].push(context.before.content);
  if(context.beforelast && context.beforelast.before) contextStartStrings[key].push(context.beforelast.before.content);
  if(context.last && context.last.before) contextStartStrings[key].push(context.last.before.content);

  lastLineContexts.push("contextlast"+key);
  allContextKeys.push("context"+key);
  allContextKeys.push("contextfirst"+key);
  allContextKeys.push("contextsecond"+key);
  allContextKeys.push("contextbeforelast"+key);
  allContextKeys.push("contextlast"+key);
  if(context.displayName){
    styles.push(context.displayName);
  }else{
    styles.push(key);
    contexts[key].displayName = key;
  }
});

// Handle paste events
exports.acePaste = function(hook, context){
  clientVars.isPasting = true;
  clientVars.enterKey = false;
}

// Bind the event handler to the toolbar buttons
exports.postAceInit = function(hook, context){
  padEditor = context.ace;

  // Put the styles available as external so things like table of contents can smell them
  clientVars.plugins.plugins.ep_context.styles = styles;

  // Setup a crude enter count
  clientVars.plugins.plugins.ep_context.crudeEnterCounter = 0;

  $.each(styles, function(k,v){
    $('.context-selection').append("<option value='"+v+"'>"+v+"</option>");
  });

  // Temporarily bodge some CSS in for debugging
  var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var head = inner.contents().find("head");
  $(head).append("<style>"+generateCSSFromContexts(contexts)+"</style>");


  var contextControlsContainerHTML = '<div id="contextButtonsContainer" style="display:block;z-index:1;margin-left:50px;"></div>';
  var floatingIcons = '<div title="Press Shift and Space to bring up Context Options" class="buttonHint"><div id="contextHint" class="contextButton contextHint">&#8679; &#43; &#9251;</div></div>';
  var buttonsHTML = '<div id="contextArrow" class="contextButton" unselectable="on">></div>';
  buttonsHTML += '<div id="deleteLineButton" class="contextButton" unselectable="on">-</div>';
  buttonsHTML += '<div id="newLineButton" class="contextButton" unselectable="on">+</div>';
  //var bigButtonHTML = '<button id="bigNewLineButton" style="width:650px;position:absolute;top:0;left:auto;margin-left:133px">+</button>';
  var contextContainer = '<div id="contextContainer" class="contextContainer"><div style="position:absolute; margin-left:-50px; width:100%; top:10px;"></div></div>';
  var optionsHTML = $('.context').html();
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = padOuter.find('iframe[name="ace_inner"]').contents();

  // Add control stuff to the UI
  //padOuter.find("#sidediv").after(bigButtonHTML);
  padOuter.find("#sidediv").after(contextControlsContainerHTML);
  padOuter.find("#sidediv").after(contextContainer);
  padOuter.find("#contextButtonsContainer").html(floatingIcons + buttonsHTML);
  padOuter.find("#contextButtonsContainer").append(optionsHTML);

  var controlsContainer = padOuter.find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  $(select).hide();
  var controls = controlsContainer.find("#contextArrow, #newLineButton, #deleteLineButton, #contextHint");

  $(select).on("keydown", function(e){
    // On tab key of select
    if(e.keyCode === 9){
      var newValue = select.find("option:selected").next().val();
      if (!newValue) var newValue = "dummy";
      select.val(newValue);
      e.preventDefault();
      return;
    }

    // On arrow keys of select
    if(e.keyCode === 13 || e.keyCode === 9){
      var newValue = $(select).val();
      context.ace.callWithAce(function(ace){
        ace.ace_doContext(newValue);
      },'context' , true);
      select.hide();

      // Re-focus our powers!
      var innerdoc = padInner[0];
      $(innerdoc).contents().find("body").blur().focus();
    }
  });

  // Top control from ribbon
  $(".context > .context-selection").change(function(contextValue){
    var newValue = $(".context > .context-selection").val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);

    // Re-focus our powers!
    var innerdoc = padInner[0];
    $(innerdoc).contents().find("body").blur().focus();
  });

  // Select on side
  $(select).click(function(contextValue){
    var newValue = $(select).val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);
    select.hide();

    // Re-focus our powers!
    var innerdoc = padInner[0];
    $(innerdoc).contents().find("body").blur().focus();
  });

  context.ace.callWithAce(function(ace){
    var doc = ace.ace_getDocument();

    // On line click show the little arrow :)
    $(doc).on("click", "div", function(e){
      // Show some buttons at this offset
      var lineNumber = $(e.currentTarget).prevAll().length;
      reDrawControls(lineNumber);
    });

    // On Big + button click create a new line
    $(padOuter).on("click", "#bigNewLineButton", function(e){
      context.ace.callWithAce(function(ace){
        rep = ace.ace_getRep();

        // We have to figure out # of lines
        var padLength = rep.lines.length();

        // Create the new line break
        var lineLength = rep.lines.atIndex(padLength-1).text.length;
        ace.ace_replaceRange([padLength-1,lineLength], [padLength-1,lineLength], "\n");

        // Get the previous line context
        var context = ace.ace_getLineContext(padLength-1);

        // Move Caret to newline
        ace.ace_performSelectionChange([padLength,0],[padLength,0])
        ace.ace_focus();

        // Set the new line context
        if(context){
          ace.ace_doContext(context);
        }

      },'context' , true);
    });

    // On click of arrow show the select options to change context
    $('iframe[name="ace_outer"]').contents().find('#outerdocbody').on("click", "#contextArrow", function(e){
      var isVisible = $(select).is(":visible");
      if(isVisible){
        $(select).hide();
        return;
      }
      var lineNumber = $(e.currentTarget).data("lineNumber");
      if(e.currentTarget){
        var offset = e.currentTarget.offsetTop + (e.currentTarget.offsetHeight/2) + 5;
        select.css("position", "absolute");
        select.css("top", offset+"px");
        select.data("lineNumber", lineNumber);
        $(select).show();
        $(select).attr('size', styles.length+1);
      }
    });


    // On click of left + icon create a new line below exisiting line
    $('iframe[name="ace_outer"]').contents().find('#outerdocbody').on("click", "#newLineButton", function(e){
      var lineNumber = $(e.currentTarget).data("lineNumber");
      var newLineNumber = lineNumber+1;

      // console.log("Creating new line under", lineNumber);
      // Create the new line break
      ace.ace_replaceRange([lineNumber+1,0], [lineNumber+1,0], "\n");

      // Take the previous line context and apply it to this line..
      // Get the context first..
      var attr = ace.ace_getLineContext(lineNumber);

      context.ace.callWithAce(function(ace){
        rep = ace.ace_getRep();
        // We have to figure out # of lines..
        var padLength = rep.lines.length();
        // Above is right..  But fucks up other editors on the page..
        ace.ace_performSelectionChange([newLineNumber,0],[newLineNumber,0])
        ace.ace_focus();
        if(attr) ace.ace_doContext(attr);
      }, 'selChange', true);

      controlsContainer.hide();
    });

    // On click of left + icon create a new line below exisiting line
    $('iframe[name="ace_outer"]').contents().find('#outerdocbody').on("click", "#deleteLineButton", function(e){
      var lineNumber = $(e.currentTarget).data("lineNumber");
      var newLineNumber = lineNumber+1;

      // console.log("Deleting line under", lineNumber);
      // Create the new line break
      ace.ace_replaceRange([lineNumber,0], [newLineNumber,0], "");

      controlsContainer.hide();
    });

  }, 'context', true);
};

function reDrawLastLineButton(rep){
  var padLength = rep.lines.length();

  // padLength is reported as 0 on pad open..  Don't continue
  if(padLength === 0) return;

  // Check to see if lastLineButton is already in the right place..
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = padOuter.find('iframe[name="ace_inner"]').contents();
  var button = padOuter.find('#bigNewLineButton');
  var div = padInner.contents().find("div").last();
  if(div[0]){
    var offset = div[0].offsetTop + div[0].offsetHeight + 20;
    // Move the button below this
    $(button).css("top", offset+"px");
  }
}

// Show the active Context
exports.aceEditEvent = function(hook, call, cb){
  // If it's not a click or a key event and the text hasn't changed then do nothing
  var cs = call.callstack;
  var rep = call.rep;
  var documentAttributeManager = call.documentAttributeManager;

  // If it's a paste event handle this uniquely..
  if(clientVars.isPasting && call.callstack.type === "idleWorkTimer" && call.callstack.docTextChanged){
    padEditor.callWithAce(function(ace){
      ace.ace_handlePaste();
    });
    clientVars.isPasting = false;
    return;
  }

  // reDraw controls to this location..  (might be a little confusing)...
  if(cs.type === "handleKeyEvent" || cs.type === "idleWorkTimer"){
    reDrawControls(rep.selStart[0]);
  }

  // Hide the select on click of the rest of the page
  if(cs.type == "handleClick"){
    $('iframe[name="ace_outer"]').contents().find('.context-selection').hide();
  }

  // reDraw last line button if we're setting up the document or it's changed at all
  if(cs.type === "setWraps" || cs.docTextChanged){
    reDrawLastLineButton(rep);
    setTimeout(function(){
      reDrawContextOnLeft(documentAttributeManager);
    },200);
  }

  if(!(cs.type == "handleClick") && !(cs.type == "handleKeyEvent") && !(cs.docTextChanged)){
    return false;
  }

  if(cs.docTextChanged === true && cs.domClean === true && cs.repChanged === true && (cs.type === "handleKeyEvent" || cs.type === "context") && clientVars.enterKey){
    clientVars.enterKey = false;
    // Define variables
    var lastLine = rep.selStart[0]-1;
    var thisLine = rep.selEnd[0];
    var padLength = rep.lines.length();

    // TODO: This should only fire on a new line, at the moment it fires on a new tab!
    var attributes = documentAttributeManager.getAttributeOnLine(lastLine, 'context');

    if(attributes){
      // First thing first we are seeing if its a big button push
      if(cs.type === "context"){
        // console.log("big button push", thisLine, attributes);
        // documentAttributeManager.setAttributeOnLine(padLength-2, 'context', attributes);
        // Commented out because it can cause the wrong attribute to be set on the line -2 from padLength
        // Now we need to move caret to here..
      }else{
        // The line did have attributes so set them on the new line
        // But before we apply a new attribute we should see if we're supposed to be dropping an context layer
        if(clientVars.plugins.plugins.ep_context.crudeEnterCounter >= 1){
        }else{ // first enter will keep the attribute
          // Make sure the line doesn't have any content in already
          // This bit appears to be broken, todo
          // This is also needed for an event that isn't actually an enter key
          // var blankLine = (call.rep.alines[thisLine] === "*0|1+1");
          // if(!blankLine) return;
          if(attributes.indexOf("last") === 0){
            attributes = attributes.substring(4, attributes.length);
          }
          if(attributes.indexOf("first") === 0){
            attributes = attributes.substring(5, attributes.length);
          }
          documentAttributeManager.setAttributeOnLine(thisLine, 'context', attributes);
        }
        clientVars.plugins.plugins.ep_context.crudeEnterCounter++;
      }
    }
  }

  // Todo, this is too agressive on events but it doesn't fire on drag/drop!
  if(cs.domClean === false && (cs.type === "handleKeyEvent" || cs.type === "context" || cs.type === "handleClick")){
    // Reassign last line to lastwhereas
    reAssignContextToLastLineOfContextType(documentAttributeManager);
  }


  // If the text has changed in the pad I need to redraw the top of the select and the left arrow

  // COMMENTED OUT: This is because this logic actually makes the UX way worst as your select can move away from your cursor position
  var controlsContainer = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  var controls = controlsContainer.find("#contextArrow");

  // It looks like we should check to see if this section has this attribute
  setTimeout(function(){ // avoid race condition..
    padEditor.callWithAce(function(ace){
      ace.ace_getLastContext(call, function(lastContext){

        if(!lastContext){ // No context set so set to dummy
          $('.context-selection').val("dummy"); // top
          select.val("dummy"); // side
        }else{

          // Show this context as being enabled.
          lastContext = lastContext.replace("context","");

          // Process first and last items from metacontexts down to contexts
          if(lastContext.indexOf("last") === 0){
            lastContext = lastContext.substring(4, lastContext.length);
          }
          if(lastContext.indexOf("first") === 0){
            lastContext = lastContext.substring(5, lastContext.length);
          }

          lastContext = contexts[lastContext].displayName;
          // lastContext = lastContext.charAt(0).toUpperCase() + lastContext.slice(1);

          // Process first and last items from metacontexts down to contexts
          if(lastContext.indexOf("Last") === 0){
            lastContext = lastContext.substring(4, lastContext.length);
          }
          if(lastContext.indexOf("First") === 0){
            lastContext = lastContext.substring(5, lastContext.length);
          }
          select.val(lastContext); // side
          $('.context-selection').val(lastContext); // top
        }
      });
    });
  },500);
}

/*****
* Editor setup
******/

// Our context attribute will result in a class
exports.aceAttribsToClasses = function(hook, context){
  var classes = [];
  if(context.key === 'context'){
    classes.push("context:"+context.value);
  }
  if(context.key.indexOf('context') !== -1){
    var contextSplit = context.key.split(":")[1];
    if(contextSplit) classes.push("context:"+contextSplit);
  }
  return classes;
}

// CAN PROBABLY DELETE BELOW FOR NOW WE LEAVE IT IN // CAKE
// Register attributes that are html markup / blocks not just classes
// This should make export export properly IE <sub>helllo</sub>world
// will be the output and not <span class=sub>helllo</span>
exports.aceAttribClasses = function(hook, attr){
//  console.log("DERP");
//  $.each("title", function(k, v){
//    attr[v] = 'tag:'+v;
//  });
//  return "context:title";
//  return attr;
}

exports.aceCreateDomLine = function(hook_name, args, cb) {
  // console.log(args.cls);
  if (args.cls.indexOf('context:') >= 0) {
    var clss = [];
    var argClss = args.cls.split(" ");
    var value;

    for (var i = 0; i < argClss.length; i++) {
      var cls = argClss[i];
      if (cls.indexOf("context:") != -1) {
	value = cls.substr(cls.indexOf(":")+1);
      } else {
	clss.push(cls);
      }
    }
    return cb([{cls: clss.join(" "), extraOpenTags: "<context"+value+">", extraCloseTags: "</context"+value+">"}]);
  }
  return cb();
};



// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function(){
  var styleArr = [];
  $.each(contexts, function(context){
console.log("YO DAWG", context);
    styleArr.push("contextfirst"+context);
    styleArr.push("context"+context);
    styleArr.push("contextlast"+context);
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
  var documentAttributeManager = this.documentAttributeManager;
  var ace = this.editorInfo;
  var rep = this.rep;
  var firstLine, lastLine;

  // Are we apply the context attribute on a full line or a selection?
  var isLineContext = (rep.selStart[0] === rep.selEnd[0]) && (rep.selStart[1] === rep.selEnd[1]);

  // Apply Context on Selection
  if(!isLineContext){
    if(level === "dummy"){
      $.each(contexts, function(k, v){
        ace.ace_setAttributeOnSelection('context:'+k, false);
      });
      return;
    }
    ace.ace_setAttributeOnSelection('context:'+level.toLowerCase(), true);
    return;
  }

  // Apply Context on entire line
  if(isLineContext){
    // console.log("applying context to entire line");
    firstLine = rep.selStart[0];
    lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
    _(_.range(firstLine, lastLine + 1)).each(function(i){

      var context = documentAttributeManager.getAttributeOnLine(i, 'context');
      // ADDING A LEVEL
      if(context !== "dummy" && context !== "" && level !== "dummy"){
        // console.log("adding a level");
        level = context + "$$" + level;
      }

      // DROPPING A LEVEL
      if(level === "dummy"){
        // Drop a level
        var contexts = context.split("$$");
        contexts.pop();
        var joinedLevel = contexts.join("$$");

        // REMOVING CONTEXT ALLTOGETHER
        if(level === "dummy" && contexts.length === 0){
          // console.log("removing attribute on line");
          documentAttributeManager.removeAttributeOnLine(i, 'context');
        }else{
          // console.log("not at bottom level so changing context for line");
          documentAttributeManager.setAttributeOnLine(i, 'context', joinedLevel.toLowerCase());
        }
      }

      // SETTING ATTRIBUTE ON LINE
      if(level !== "dummy" && level){
        // console.log("set attr on", firstLine, level.toLowerCase());
        documentAttributeManager.setAttributeOnLine(i, 'context', level.toLowerCase());
      }
    });
  }
}

// Get the context of a line
function getLastContext(editorContext, cb){
  var rep = editorContext.rep;
  var ace = this.editorInfo;
  var documentAttributeManager = editorContext.documentAttributeManager;
  var foundOnLine = false;
  var foundOnSelection = false;

  // See if the line attributes has an attribute
  var firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each(function(i){
    // Does range already have attribute?
    var attributes = documentAttributeManager.getAttributeOnLine(i, 'context');
    // console.log("attributes", attributes);
    // take last attribute from attributes, split it
    var split = attributes.split("$$");
    // clean empty values
    split = cleanArray(split);
    var lastContext = split[split.length-1];
    // return cb(lastContext);
    foundOnLine = lastContext;
  });

  // See if the current selection has the attribute
  $.each(contexts, function(context){
    // This could probably be optimized with a indexOf
    if(documentAttributeManager.getAttributeOnSelection("context:"+context, true)){
      foundOnSelection = context;
      return false;
    }
  });

  if(foundOnSelection){
    // console.log("returned a found on selection value", foundOnSelection);
    return cb(foundOnSelection);
  }
  if(foundOnLine){
    // console.log("returned a found on line value", foundOnLine);
    return cb(foundOnLine);
  }
  if(!foundOnSelection && !foundOnLine){
    // console.log("no attribute found");
    return cb(null);
  }

}

// Get the full context of a line
function getLineContext(lineNumber){
  var documentAttributeManager = this.documentAttributeManager;
  // Does range already have attribute?
  var attributes = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
  // take last attribute from attributes, split it
  var split = attributes.split("$$");
  // clean empty values
  split = cleanArray(split);
  var lastContext = split[split.length-1];
  return lastContext;
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doContext = _(doContext).bind(context);
  editorInfo.ace_getLastContext = _(getLastContext).bind(context);
  editorInfo.ace_handlePaste = _(handlePaste).bind(context);
  editorInfo.ace_getLineContext = _(getLineContext).bind(context);
}

// Here we convert the class context:x into a tag
exports.aceDomLineProcessLineAttributes = function(name, context){
  var preHtml = "";
  var postHtml = "";
  var processed = false;

  var contextsFound = /context:(.*?) /i.exec(context.cls);
  if(!contextsFound && !processed) return [];
  if(contextsFound){
    var context = contextsFound[1];
    var splitContexts = context.split("$$");
    $.each(splitContexts, function(k, context){
      $.each(allContextKeys, function(k, contextKey){
        if(contextKey === "context"+context){
          preHtml += '<context' + context + ' class="context">';
          postHtml += '</context' + context + ' class="context">';
          processed = true;
        }
      });
    });
  }

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

// Cleans arrays of duplicates
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
  var rep = e.rep;
  var evt = e.evt;

  // May aswell set a clientVar on Enter press, this makes things a lot cleaner :)
  if(evt.keyCode === 13 && evt.type === "keydown"){
    clientVars.enterKey = true;
  }else{
    clientVars.enterKey = false;
  }

  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var select = $('iframe[name="ace_outer"]').contents().find('.context-selection');

  if(evt.keyCode !== 13 && !evt.shiftKey){
    padOuter.contents().find('#contextButtonsContainer').hide();
    padOuter.contents().find('.context-selection').hide();
  }

  // if we don't hit enter then reset crude Enter Counter
  if(evt.keyCode !== 13){
    clientVars.plugins.plugins.ep_context.crudeEnterCounter = 0;
  }

  // If we do hit space and shift then show select and drop focus into it?
  if(evt.keyCode === 32 && evt.shiftKey && evt.type === "keydown"){
    var lineNumber = rep.selStart[0]+1;
    var line = padInner.contents().find("div:nth-child("+lineNumber+")");
    if(!line[0]) return;
    var offset = line[0].offsetTop + (line[0].offsetHeight/2) + 13;
    select.css("position", "absolute");
    select.css("top", offset+"px");
    select.data("lineNumber", lineNumber);
    $(select).attr('size', styles.length+1).show().css("position", "absolute");
    $(select).focus();
    e.evt.preventDefault(); // Prevent default behavior
    return true;
  }

  // If we hit arrow key up/down move between contexts options
  if((evt.keyCode === 40 || evt.keyCode === 38) && evt.type === "keydown"){
    // console.log("shift tab", select.is(":visible"));
    // is Select visible?
    if( select.is(":visible") ){
      // prevent de-indent
      e.evt.preventDefault();
      // tab through item in context
      // get current value
      var nextVal = select.children(':selected').prev().val();
      select.val(nextVal);
      // console.log(nextVal);
      if(!nextVal) nextVal = "dummy";
      e.editorInfo.ace_doContext(nextVal);
      // put caret back in correct place
      // console.log(e.rep.selStart, e.rep.selEnd);
      e.editorInfo.ace_performSelectionChange(e.rep.selStart,e.rep.selEnd)
    }
  }
}

function reDrawControls(lineNumber){
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var controlsContainer = padOuter.find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  var controls = controlsContainer.find("#contextArrow, #newLineButton, #deleteLineButton, #contextHint");

  var line = padInner.contents().find("div").eq(lineNumber);
  if(!line[0]) return;
  var offsetTop = line[0].offsetTop || 0;
  var offsetHeight = line[0].offsetHeight /2;

  // Get the offset of the line
  var offset = offsetTop + offsetHeight;

  controlsContainer.show();
  controls.css("top", offset+"px");
  controls.data("lineNumber", lineNumber);
}

function reDrawContextOnLeft(documentAttributeManager){
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var contextContainer = padOuter.find('#contextContainer');

  // for each line
  var lines = padInner.contents().find("div");

  // Timeout to avoid race condition
  contextContainer.html("");

  //get the line context
  $.each(lines, function(k, line){

    // get offset and height
    var offsetTop = $(line)[0].offsetTop || 0
    var offsetHeight = $(line)[0].offsetHeight /2;
    var offset = offsetTop + offsetHeight;
    var context = documentAttributeManager.getAttributeOnLine(k, 'context');

    // Given hello$$world returns ["hello","world"];
    var splitContexts = context.split("$$");

    context = splitContexts[splitContexts.length-1];

    if(!context){
      // No context available to draw a big No Context thingy
      contextContainer.append("<div class='contextLabel nocontext' style='top:"+offset+"px'>No Context</div>");
      return;
    }
    if(!offset) return;

    // Process first and last items from metacontexts down to contexts
    if(context.indexOf("last") === 0){
      context = context.substring(4, context.length);
    }
    if(context.indexOf("first") === 0){
      context = context.substring(5, context.length);
    }

    context = context.toLowerCase(); // support legacy docs

    // draw the context value on the screen
    contextContainer.append("<div class='contextLabel' style='top:"+offset+"px'>"+contexts[context].displayName+"</div>");
  });
}

function reAssignContextToLastLineOfContextType(documentAttributeManager){
  // Iterate through document
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');

  // for each line
  var lines = padInner.contents().find("div");
  var thisContexts = {};
  $.each(lines, function(k, line){
    thisContexts[k] = {};
    // console.log("line", line);
    // Find last contextwhereas
    var searchString = allContextKeys + "";
    var hasContext = $(line).find(searchString);
    if(hasContext[0]) var context = hasContext[0].localName;
    // If the line is whereas or lastwhereas context store this data in an object
    if(!hasContext) return;
    if(hasContext.length > 0){
      thisContexts[k].hasContext = true;
      $.each(contexts, function(context){
        if(context.indexOf("context") !== -1){
          thisContexts[k].context = context;
        }
      });
    }

    var lastLineSearchString = lastLineContexts + "";
    var isLastLine = $(line).find(lastLineSearchString);
    if(isLastLine.length > 0){
      // If the line is whereas or lastwhereas context store this data in an object
      thisContexts[k].hasLastLine = true;
    }
  });

  // Go through our existing object and check to see if it's right..
  $.each(thisContexts, function(k, line){
    var lineNumber = parseInt(k);
    var context = line.context;
    var thisLine = line;
    var nextLine = {};
    var prevLine = {};
    var sizeOfContexts = Object.size(thisContexts);

    // If this is not the first line get the values of the previous line
    if (k > 0){
      prevLine = thisContexts[k-1];
    }
    // If this is not the last line get the values of the next line
    if (k < sizeOfContexts){
      var nextLineKey = parseInt(k)+1;
      if(thisContexts[nextLineKey]) nextLine = thisContexts[nextLineKey];
    }

    var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
    nextLine.context = documentAttributeManager.getAttributeOnLine(lineNumber+1, 'context');
    thisLine.context = context;

/*
    console.log("prevLine", prevLine);
    console.log("thisLine", thisLine);
    console.log("nextLine", nextLine);
*/
    // REMOVE LASTLINE
    // If this line has lastwhereas context AND the next line has whereas then this line should not have lastwhereas
    // If this lines context is the same as the next lines context
    // So remove it..
    if(thisLine.hasLastLine && nextLine.hasContext && (nextLine.context === thisLine.context)){
      documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
      $.each(contexts, function(contextKey){
        if(context.indexOf(contextKey) !== -1){
          // console.warn("removed lastline from ", lineNumber);
          documentAttributeManager.setAttributeOnLine(lineNumber, 'context', contextKey);
        }
      });
    }

    // REMOVE FIRSTLINE
    // If this line has lastwhereas context AND the next line has whereas then this line should not have lastwhereas
    // So remove it..
    $.each(contexts, function(contextKey){
      if(context.indexOf("first"+contextKey) !== -1){
        if(thisLine.hasContext && (prevLine.context === contextKey || prevLine.context === "first"+contextKey) && context){
          documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
          // console.warn("set NORMAL on ", lineNumber);
          documentAttributeManager.setAttributeOnLine(lineNumber, 'context', contextKey);
          // console.log("removing firstwhereas from ", lineNumber, thisLine, prevLine, context)
        }
      }
    });

    // ADD LASTLINE
    // If this line has context and the next line doesn't, then this line should get lastwhereas
    // If this line has different context to the next line
    if(thisLine.hasContext && prevLine.hasContext && (nextLine.context !== thisLine.context && nextLine.context !== "last"+thisLine.context)){
      // console.log("setting last line on ", lineNumber, thisLine);
      // Check to see if this line number already has lastwhere context value
      // var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
      // console.log("Current context of line", lineNumber, context);
      $.each(contexts, function(contextKey){
        if(context !== "last"+contextKey && context === contextKey){
          // console.warn("set LASTLINE on ", lineNumber);
          documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
          documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'last'+contextKey);
        }
      });
    }

    // ADD FIRSTLINE
    // If this is the first line with this context
    $.each(contexts, function(contextKey){
      if(thisLine.hasContext && (prevLine.context !== contextKey)){
        var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
        // console.log("Current context of line", lineNumber, context);
        if(context === contextKey && prevLine.context !== "first"+contextKey){
          // console.log("setting first", lineNumber, "first"+context);
          // console.warn("set FIRSTLINE on ", lineNumber);
          documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
          documentAttributeManager.setAttributeOnLine(lineNumber, 'context', "first"+contextKey);
        }
      }
    });
  });
}

function handlePaste(){
  var context = this;
  var documentAttributeManager = context.documentAttributeManager;
  // Get each line
  var lines = $('iframe[name="ace_outer"]').contents().find('iframe').contents().find("#innerdocbody").children("div");
  var toDestroy = [];

  // Go through each line of the document
  $.each(lines, function(index, line){
    var lineText = $(line).text();
    var lineContext = false;
    // console.log("lineText", lineText, "lineText.length", lineText.length);

    if (/^\s+$/.test(lineText)){
      toDestroy.push(index);
    }

    if(lineText.length === 0){
      toDestroy.push(index);
    }

    // See if the line has the whereas content
    var cleanLineText = lineText.toLowerCase();
    var strPosition = false;
    var hasContext = false;

    $.each(contextStrings, function(k, contextString){
      strPos = cleanLineText.indexOf(contextString.toLowerCase()); // Where is the string in the line
      if(strPos !== -1){

        // How do we know which context ID this contextString is from?
        $.each(contextStartStrings, function(key, strings){
          $.each(strings, function(k, startString){
            if( cleanLineText.indexOf(startString.toLowerCase()) !== -1){
              lineContext = key;
            }
          });
        });

        // I'm not sure why we can't use this simple value above..
        // TODO: investigate this bit further
        hasContext = k; // Sets which context we have
        strPosition = strPos;
      }
    });

    // Remove any lines that just container dashed lines
    // TODO, use regular expression
    if(cleanLineText.indexOf("______") === 0 || cleanLineText.indexOf("---") === 0){
      toDestroy.push(index);
    }

    cleanLineText = cleanLineText.trim();
    if(hasContext !== false){ // Note that the index may be 0 because so we need this statement
      // If line has where whereas content then
      // console.log("This line has whereas text", lineText, index);
      // move caret to this location
      var lineNumber = index;

      context.editorInfo.ace_callWithAce(function(ace){
        // console.log("replacing content on ", lineNumber);

        var startLocation = 0;
        var endLocation = contextStrings[hasContext].length;

        // remove "whereas" etc. content from string
        // if line has line attribute marker this will be wrong
        // Check if the line already has an attribute maker and if so bump 0 to 1 and 8 to 9
        // HACK I don't think this is the best way but for now it will do..
        var attributeLength = documentAttributeManager.rep.alines[lineNumber].length;
        if(attributeLength > 8){
          // startLocation = 1;
          endLocation = endLocation +1;
        }

        // Check to see if there is any white space prefixing the string.
        var stringWithoutContext = cleanLineText.substring(contextStrings[hasContext].length,cleanLineText.length);
        // Strip leading ,'s a common cause of gum disease
        if(stringWithoutContext[0] === ","){
          endLocation++;
          stringWithoutContext = stringWithoutContext.substring(1, stringWithoutContext.length);
        }


        // Strip leading white space
        // Causesa problem w/ Hoops in the Hood document
        // var regex = /^\s*/;
        // var numberOfPrefixSpaces = stringWithoutContext.match(regex)[0].length;
        // if(numberOfPrefixSpaces){
        //   endLocation = endLocation + numberOfPrefixSpaces;
        // }

        $.each(contexts, function(contextKey){
          if(contextKey === lineContext){
            // Removes everything noisy to keep things clean, fresh and minty - PREFIX
            ace.ace_replaceRange([lineNumber,startLocation], [lineNumber,strPosition+endLocation], "");
          }
        });

        // Removes everything noisy to keep things clean, fresh and minty - SUFFIX
        // This is temporary logic, we can do this better.
        $.each(contexts, function(contextKey, context){
          if(context.after && context.after.content){
            var removeThis = contexts[contextKey].after.content;
            if(stringWithoutContext.substring(stringWithoutContext.length - removeThis.length, stringWithoutContext.length) === removeThis){
              // console.log("string has ; and ,", lineNumber, stringWithoutContext);
              ace.ace_replaceRange([lineNumber,stringWithoutContext.length - removeThis.length -1], [lineNumber,stringWithoutContext.length-1], "");
            }
          }
        });

        // Set the Attribute to Whereas for the line
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', lineContext);



      });
    }else{
      var lineNumber = index;

      context.editorInfo.ace_callWithAce(function(ace){
        // Line doesn't have an attribute so only strip it clean
        var regex = /^\s*/;
        var numberOfPrefixSpaces = lineText.match(regex)[0].length;
        // console.log("Number of Prefix Spaces", numberOfPrefixSpaces);
        var endLocation = 0;
        var startLocation = 0;
        if(numberOfPrefixSpaces){
          endLocation = endLocation + numberOfPrefixSpaces;
        }
        ace.ace_replaceRange([lineNumber,startLocation], [lineNumber,endLocation], "");
      });
    }
  });


  // Do the actual line destruction
  context.editorInfo.ace_callWithAce(function(ace){
    // We process the document from the bottom up so the reps don't change
    // under us!
    toDestroy = toDestroy.reverse();
    $.each(toDestroy, function(i, lineNumber){
      ace.ace_replaceRange([lineNumber,0], [lineNumber+1,0], "");
    });
  });

  // TODO: do this another time..  Not important for initial roll out..
  // Need a split value IE "Presented by" and " on ", so basically two values..
  // So if it starts with "presented by" and has "on" then split the line..
  // Something to add to contexts.js

  // Now go through every line looking for lines we have to split
  // Sponsors get magically broken into two parts!
  // This doesn't work because of issue #47 where trying to add an additional line with replaceRange will
  // NOTE: Iterating twice is horribly inefficient but we have to because if we don't we get errors
  // This could be rewritten to perform better though
  $.each(lines, function(lineNumber, line){
    var lineText = $(line).text();
    // Disabled for now...
    /*
    if(lineText.indexOf("Presented by") === 0){
      context.editorInfo.ace_callWithAce(function(ace){
        if(lineText.indexOf(" on ") !== -1) splitLocation = lineText.indexOf(" on ");

        if(!splitLocation) return;
        // Break the lines up
        ace.ace_replaceRange([lineNumber-1,splitLocation+2], [lineNumber-1,splitLocation+2], "\n");
        // Set first line as Sponsor
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'Sponsor');
        // Sec second line as date
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'Date');
      });
    }
    */
  });

  // Redraw last line as we modified layout..
  reDrawLastLineButton(context.rep);
  reDrawContextOnLeft(context.documentAttributeManager);
  reAssignContextToLastLineOfContextType(documentAttributeManager);
}

Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};
