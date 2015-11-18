var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padEditor;

var styles = ["Sponsor", "Title", "Whereas", "Resolved", "Signature", "Date"];

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

  var contextControlsContainerHTML = '<div id="contextButtonsContainer" style="display:block;z-index:1;margin-left:50px;"></div>';
  var floatingIcons = '<div title="Press Shift and Space to bring up Context Options" class="buttonHint"><div id="contextHint" class="contextButton contextHint">&#8679; &#43; &#9251;</div></div>';
  var buttonsHTML = '<div id="contextArrow" class="contextButton" unselectable="on">></div>';
  buttonsHTML += '<div id="deleteLineButton" class="contextButton" unselectable="on">-</div>';
  buttonsHTML += '<div id="newLineButton" class="contextButton" unselectable="on">+</div>';
  var bigButtonHTML = '<button id="bigNewLineButton" style="width:650px;position:absolute;top:0;left:auto;margin-left:133px">+</button>';
  var contextContainer = '<div id="contextContainer" class="contextContainer"><div style="position:absolute; margin-left:-50px; width:100%; top:10px;"></div></div>';
  var optionsHTML = $('.context').html();
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = padOuter.find('iframe[name="ace_inner"]').contents();

  // Add control stuff to the UI
  padOuter.find("#sidediv").after(bigButtonHTML);
  padOuter.find("#sidediv").after(contextControlsContainerHTML);
  padOuter.find("#sidediv").after(contextContainer);
  padOuter.find("#contextButtonsContainer").html(floatingIcons + buttonsHTML);
  padOuter.find("#contextButtonsContainer").append(optionsHTML);

  var controlsContainer = padOuter.find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  $(select).hide();
  var controls = controlsContainer.find("#contextArrow, #newLineButton, #deleteLineButton, #contextHint");

  // Selection event
  /*
  $('.context-selection').click(function(contextValue){
    var newValue = $('.context-selection').val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);

    // Re-focus our powers!
    var innerdoc = padInner[0];
    $(innerdoc).contents().find("body").blur().focus();
  });
  */

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
          if(attributes === "lastwhereas") attributes = "Whereas";
          if(attributes === "lastresolved") attributes = "Resolved";
          if(attributes === "firstresolved") attributes = "Resolved";
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
    getLastContext(call, function(lastContext){
      if(!lastContext){ // No context set so set to dummy
        $('.context-selection').val("dummy"); // top
        select.val("dummy"); // side
      }else{
        // Show this context as being enabled.
        lastContext = lastContext.replace("context","");
        lastContext = lastContext.charAt(0).toUpperCase() + lastContext.slice(1);
	if(lastContext === "Lastwhereas") lastContext = "Whereas";
	if(lastContext === "Lastresolved") lastContext = "Resolved";
	if(lastContext === "Firstresolved") lastContext = "Resolved";
        select.val(lastContext); // side
        $('.context-selection').val(lastContext); // top
      }
    });
  },500);
}

/*****
* Editor setup
******/

// Our sup/subscript attribute will result in a class
// I'm not sure if this is actually required..
exports.aceAttribsToClasses = function(hook, context){
  var classes = [];
  if(context.key == 'context'){
    classes.push("context:"+context.value);
  }
  return classes;
}

// Block elements - Prevents character walking
exports.aceRegisterBlockElements = function(){
  var styleArr = [];
  styleArr.push("contextlastwhereas");
  styleArr.push("contextlastresolved");
  styleArr.push("contextfirstresolved");

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
  var documentAttributeManager = this.documentAttributeManager;
  var rep = this.rep;
  var firstLine, lastLine;
  firstLine = rep.selStart[0];
  lastLine = Math.max(firstLine, rep.selEnd[0] - ((rep.selEnd[1] === 0) ? 1 : 0));
  _(_.range(firstLine, lastLine + 1)).each(function(i){
    if(level === "dummy"){
      // console.log("removing attribute on line");
      documentAttributeManager.removeAttributeOnLine(i, 'context');
    }else{
      // console.log("set attr on", firstLine, level);
      documentAttributeManager.setAttributeOnLine(i, 'context', level);
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

// Get the full context of a line
function getLineContext(lineNumber){
  var documentAttributeManager = this.documentAttributeManager;
  // Does range already have attribute?
  var attributes = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
  // take last attribute from attributes, split it
  var split = attributes.split("$");
  // clean empty values
  split = cleanArray(split);
  var lastContext = split[split.length-1];
  return lastContext;
}

exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_doContext = _(doContext).bind(context);
  editorInfo.ace_handlePaste = _(handlePaste).bind(context);
  editorInfo.ace_getLineContext = _(getLineContext).bind(context);
}

// Here we convert the class context:x into a tag 
exports.aceDomLineProcessLineAttributes = function(name, context){
  var preHtml = "";
  var postHtml = "";
  var processed = false;

  var contexts = /context:(.*?) /i.exec(context.cls);
  if(!contexts && !processed) return [];
  if(contexts){
    var tags = contexts[1];
    tags = tags.split("$");

    $.each(tags, function(i, tag){
      if(tag.substring(0,7) === "context"){
        // on paste we have the correct context defined so we need to modify it back to the tag
        tag = tag.substring(7,tag.length);
        tag = tag.charAt(0).toUpperCase() + tag.slice(1);
      }
      if(styles.indexOf(tag) !== -1 || tag === "lastwhereas" || tag === "lastresolved" || tag === "firstresolved"){
        preHtml += '<context' + tag + ' class="context">';
        postHtml += '</context' + tag + ' class="context">';
        processed = true;
      }
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
    if(context){
      // draw the context value on the screen
      if(offset){
        if(context === "lastwhereas") context = "Whereas";
        if(context === "lastresolved") context = "Resolved";
        if(context === "firstresolved") context = "Resolved";
        if(context === "contextresolved") context = "Resolved";
        contextContainer.append("<div class='contextLabel' style='top:"+offset+"px'>"+context+"</div>");
      }
    }else{
      if(offset){ // Handle bug where it would randomly throw a context label at offset 0
        contextContainer.append("<div class='contextLabel nocontext' style='top:"+offset+"px'>No Context</div>");
      }
    }
  });
}

function reAssignContextToLastLineOfContextType(documentAttributeManager){
  // Iterate through document
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');

  // for each line
  var lines = padInner.contents().find("div");
  var contexts = {};
  $.each(lines, function(k, line){
    contexts[k] = {};
    // console.log("line", line);
    // Find last contextwhereas
    var hasContext = $(line).find("contextwhereas, contextlastwhereas, contextresolved, contextlastresolved , contextfirstresolved");
    if(hasContext[0]) var context = hasContext[0].localName;
    // If the line is whereas or lastwhereas context store this data in an object
    if(!hasContext) return;
    if(hasContext.length > 0){
      contexts[k].hasContext = true;
      if(context === "contextwhereas" || context === "contextlastwhereas"){
        contexts[k].context = "whereas"
      }
      if(context === "contextresolved" || context === "contextlastresolved" || context === "contextfirstresolved"){
        contexts[k].context = "resolved"
      }
    }
    var isLastLine = $(line).find("contextlastwhereas, contextlastresolved");
    if(isLastLine.length > 0){
      // If the line is whereas or lastwhereas context store this data in an object
      contexts[k].hasLastLine = true;
    }
  });

  // Go through our existing object and check to see if it's right..
  $.each(contexts, function(k, line){
    var lineNumber = parseInt(k);
    var context = line.context;
    var thisLine = line;
    var nextLine = {};
    var prevLine = {};
    var sizeOfContexts = Object.size(contexts);

    // If this is not the first line get the values of the previous line
    if (k > 0){
      prevLine = contexts[k-1];
    }
    // If this is not the last line get the values of the next line
    if (k < sizeOfContexts){
      var nextLineKey = parseInt(k)+1;
      if(contexts[nextLineKey]) nextLine = contexts[nextLineKey];
    }

    var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');

    // console.log("prevLine", prevLine);
    // console.log("thisLine", thisLine);
    // console.log("nextLine", nextLine);

    // REMOVE LASTLINE
    // If this line has lastwhereas context AND the next line has whereas then this line should not have lastwhereas
    // If this lines context is the same as the next lines context
    // So remove it..
    if(thisLine.hasLastLine && nextLine.hasContext && (nextLine.context === thisLine.context)){
      documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
      if(context === "whereas" || context === "lastwhereas" || context === "firstwhereas") documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'Whereas');
      if(context === "resolved" || context === "lastresolved" || context === "firstresolved") documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'Resolved');
      // console.log("removing lastwhereas from ", lineNumber, thisLine)
    }

    if(context === "contextfirstresolved" || context === "firstresolved"){
      // REMOVE FIRSTLINE
      // If this line has lastwhereas context AND the next line has whereas then this line should not have lastwhereas
      // So remove it..

      if(thisLine.hasContext && (prevLine.context === "resolved" || prevLine.content === "firstresolved") && context){
        documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'Resolved');
        // console.log("removing firstwhereas from ", lineNumber, thisLine, prevLine, context)
      }
    }

    // ADD LASTLINE
    // If this line has context and the next line doesn't, then this line should get lastwhereas
    // If this line has different context to the next line
    if(thisLine.hasContext && prevLine.hasContext && (nextLine.context !== thisLine.context)){
      // console.log("setting last line on ", lineNumber, thisLine);
      // Check to see if this line number already has lastwhere context value
      // var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
      // console.log("Current context of line", lineNumber, context);
      if(context !== "lastWhereas" && context === "Whereas"){
        documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'lastwhereas');
      }

      if(context !== "lastResolved" && context === "Resolved" || context === "contextresolved"){
        documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'lastresolved');
      }
    }

    // ADD FIRSTLINE
    // If this is the first line with this context
    if(thisLine.hasContext && (prevLine.context !== "resolved")){
      // console.log("setting first line on ", lineNumber, thisLine);
      // Check to see if this line number already has lastwhere context value
      var context = documentAttributeManager.getAttributeOnLine(lineNumber, 'context');
      // console.log("Current context of line", lineNumber, context);
      if(context === "Resolved" || context === "lastresolved"){
        // console.log("setting first", lineNumber);
        documentAttributeManager.removeAttributeOnLine(lineNumber, 'context');
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', 'firstresolved');
      }
    }
  });
}

function handlePaste(){
  var context = this;
  var documentAttributeManager = context.documentAttributeManager;
  // Get each line
  var lines = $('iframe[name="ace_outer"]').contents().find('iframe').contents().find("#innerdocbody").children("div");
  var toDestroy = [];

  var contextStrings = ["whereas", "be it resolved", "be it further resolved"];
  var contexts = ["Whereas", "Resolved", "Resolved"];

  // Go through each line of the document
  $.each(lines, function(index, line){
    var lineText = $(line).text();
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
      strPos = cleanLineText.indexOf(contextString); // Where is the string in the line
      if(strPos !== -1){
       hasContext = k; // Sets which context we have
       strPosition = strPos;
      }
    });

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
          startLocation = 1;
          endLocation = endLocation +1;
        }

        // Check to see if there is any white space prefixing the string.
        var stringWithoutContext = cleanLineText.substring(contextStrings[hasContext].length,cleanLineText.length);

        // Strip leading ,'s a common cause of gum disease
        if(stringWithoutContext[0] === ","){
          endLocation++;
          stringWithoutContext = stringWithoutContext.substring(1, stringWithoutContext.length);
        }

        // Stripp leading white space
        var regex = /^\s*/;
        var numberOfPrefixSpaces = stringWithoutContext.match(regex)[0].length;

        if(numberOfPrefixSpaces){
          endLocation = endLocation + numberOfPrefixSpaces;
        }

        // Removes everything noisy to keep things clean, fresh and minty
        ace.ace_replaceRange([lineNumber,startLocation], [lineNumber,strPosition+endLocation], "");

        // Set the Attribute to Whereas for the line
        documentAttributeManager.setAttributeOnLine(lineNumber, 'context', contexts[hasContext]);
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
