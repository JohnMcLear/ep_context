var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

// var styles = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];
var styles = ["Sponsor", "Title", "Whereas", "Resolved", "Signature", "Date"];
/*
var stylesCSS = ["contextparagraph{margin-left:10px;color:green;}",
  "contextform{text-align:center;display:block;}",
  "contextsection > contextheader, contextsection > contextenum{text-align:center;display:block;}",
  "contextenum{font-weight:bolder;}",
  "contextheader{font-weight:bolder;}",
  "contextcongress{font-variant: small-caps;}",
  "contextsession{font-variant: small-caps;}",
  "contextsubsection{margin-left:15px;color:blue;}",
  "contextdistribution-code{text-align:right;display:block;}"]
*/

// var stylesCSS = [
//   "contexttitle{text-align:center;display:block;font-size:18px;line-height:36px;}",
//   "contextwhereas::before{content: 'Whereas '}"
// ];

/*****
* Basic setup
******/

// Bind the event handler to the toolbar buttons
exports.postAceInit = function(hook, context){
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

  // $.each(stylesCSS, function(k,css){
  //   head.append("<style>"+css+"</style>");
  // });

  var contextControlsContainerHTML = '<div id="contextButtonsContainer" style="display:block;z-index:1;margin-left:50px;"></div>';
  var buttonsHTML = '<div id="newLineButton" style="position:absolute; cursor:pointer; border:solid 1px black; padding: 0px 2px 0px 2px; margin-left:30px;" unselectable="on">+</div>';
  buttonsHTML += '<div id="contextArrow" style="position:absolute;cursor:pointer;border:solid 1px black;padding:0px 2px 0px 2px" unselectable="on">></div>';
  buttonsHTML += '<div id="deleteLineButton" style="position:absolute; cursor:pointer; border:solid 1px black; padding: 0px 4px 0px 4px; margin-left:15px;" unselectable="on">-</div>';
  var bigButtonHTML = '<button id="bigNewLineButton" style="width:650px;position:absolute;top:0;left:auto;margin-left:133px">+</button>';
  var contextContainer = '<div id="contextContainer" class="contextContainer"><div style="position:absolute; margin-left:-50px; width:100%; top:10px;"></div></div>';
  var optionsHTML = $('.context').html();
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = padOuter.contents().find('#innerdocbody');

  // Add control stuff to the UI
  padOuter.find("#sidediv").after(bigButtonHTML);
  padOuter.find("#sidediv").after(contextControlsContainerHTML);
  padOuter.find("#sidediv").after(contextContainer);
  padOuter.find("#contextButtonsContainer").html(buttonsHTML);
  padOuter.find("#contextButtonsContainer").append(optionsHTML);

  var controlsContainer = padOuter.find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  var controls = controlsContainer.find("#contextArrow, #newLineButton, #deleteLineButton");

  // Selection event
  $('.context-selection').change(function(contextValue){
    var newValue = $('.context-selection').val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);
  });

  $(select).change(function(contextValue){
    var newValue = $(select).val();
    context.ace.callWithAce(function(ace){
      ace.ace_doContext(newValue);
    },'context' , true);
    select.hide();
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
          // console.log("context", context);
          ace.ace_doContext(context);
        }

      },'context' , true);
    });

    // On click of arrow show the select options to change context
    $('iframe[name="ace_outer"]').contents().find('#outerdocbody').on("click", "#contextArrow", function(e){
      var lineNumber = $(e.currentTarget).data("lineNumber");
      var offset = e.currentTarget.offsetTop + (e.currentTarget.offsetHeight/2) + 5;
      select.css("position", "absolute");
      select.css("top", offset+"px");
      select.data("lineNumber", lineNumber);
      $(select).show();
      $(select).attr('size', styles.length+1); // TODO dont be hardcoded
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
        ace.ace_doContext(attr);
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

function reDrawLastLineButton(cs, documentAttributeManager, rep){

  var padLength = rep.lines.length();

  // This is kinda weird but basically EP stores line #1 as 1 not 0 so we reduce length
  padLength = padLength-1;

  // padLength is reported as 0 on pad open..  Don't continue
  if(padLength === 0) return;

  // Check to see if lastLineButton is already in the right place..
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var padInner = padOuter.find('iframe[name="ace_inner"]').contents();
  var button = padOuter.find('#bigNewLineButton');
  var div = padInner.contents().find("div").last();
  var offset = div[0].offsetTop + div[0].offsetHeight + 20;

  // Move the button below this
  $(button).css("top", offset+"px");
}

// Show the active Context
exports.aceEditEvent = function(hook, call, cb){
  // If it's not a click or a key event and the text hasn't changed then do nothing
  var cs = call.callstack;
  var rep = call.rep;
  var documentAttributeManager = call.documentAttributeManager;

  // reDraw controls to this location..  (might be a little confusing)...
  if(cs.type === "handleKeyEvent" || cs.type === "idleWorkTimer"){
    reDrawControls(rep.selStart[0]);
  }

  // reDraw last line button if we're setting up the document or it's changed at all
  if(cs.type === "setWraps" || cs.docTextChanged){
    reDrawLastLineButton(cs, documentAttributeManager, rep);
    reDrawContextOnLeft(cs, documentAttributeManager, rep);
  }

/*
  if(cs.docTextChanged === true && cs.domClean === true && cs.repChanged === true){
    reDrawContextOnLeft(cs, documentAttributeManager, rep);
  }
*/

  if(!(cs.type == "handleClick") && !(cs.type == "handleKeyEvent") && !(cs.docTextChanged)){
    return false;
  }

  if(cs.docTextChanged === true && cs.domClean === true && cs.repChanged === true && (cs.type === "handleKeyEvent" || cs.type === "context")){ 
    var lastLine = rep.selStart[0]-1;
    var thisLine = rep.selEnd[0];
    var padLength = rep.lines.length();

    // This should only fire on a new line, at the moment it fires on a new tab!
    var attributes = documentAttributeManager.getAttributeOnLine(lastLine, 'context');

    if(attributes){
      // First thing first we are seeing if its a big button push
      if(cs.type === "context"){
        // console.log("set", thisLine, attributes);
        documentAttributeManager.setAttributeOnLine(padLength-2, 'context', attributes);
        // Now we need to move caret to here..
      }else{
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
            // documentAttributeManager.setAttributeOnLine(thisLine, 'context', ['null']);
            documentAttributeManager.removeAttributeOnLine(thisLine, 'context');
            // remove on previous line too	
            // documentAttributeManager.setAttributeOnLine(thisLine-1, 'context', ['null']);
            documentAttributeManager.removeAttributeOnLine(thisLine-1, 'context');
          }
          return true;
        }else{ // first enter will keep the attribute
          // Make sure the line doesn't have any content in already
          // This bit appears to be broken, todo
          // var blankLine = (call.rep.alines[thisLine] === "*0|1+1");
          // if(!blankLine) return;
          documentAttributeManager.setAttributeOnLine(thisLine, 'context', attributes);
        }
        clientVars.plugins.plugins.ep_context.crudeEnterCounter++;
      }
      return true;
    }
  }

  // It looks like we should check to see if this section has this attribute
  setTimeout(function(){ // avoid race condition..
    getLastContext(call, function(lastContext){
      // Show this context as being enabled.
      $('.context-selection').val(lastContext);
    });
  },250);

  // If the text has changed in the pad I need to redraw the top of the select and the left arrow

  // COMMENTED OUT: This is because this logic actually makes the UX way worst as your select can move away from your cursor position
  var controlsContainer = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  var controls = controlsContainer.find("#contextArrow");

/*
  // Does controls have a line Attr?
  var lineNumber = controls.data("lineNumber");
  if(lineNumber){
    // Oh it does, then we better redraw the top of it.
    // Firstly we need the actual line
    var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
    var padInner = padOuter.find('iframe[name="ace_inner"]').contents();
    var line = padInner.find("#innerdocbody > div:nth-child("+lineNumber+")");
    var offset = line[0].offsetTop + (line[0].offsetHeight/2);
    // better do some math on that offset again..
    // console.log("changing offset top to ", offset+"px");
    controls.css("top", offset+"px");
  }
*/

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
        select.val(lastContext); // side
        $('.context-selection').val(lastContext); // top
      }
    });
  },250);
	
    
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
    // Does range already have attribute?  Commented out because stacking not required
/*
    var attributes = documentAttributeManager.getAttributeOnLine(i, 'context');
    if(attributes || level){
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
        // Temporary patch to not allow multiple contexts on a line
        documentAttributeManager.setAttributeOnLine(i, 'context', attributes);
      }else{
        documentAttributeManager.removeAttributeOnLine(i, 'context');
      }
    }
*/
    if(level === "dummy"){
      documentAttributeManager.removeAttributeOnLine(i, 'context');
    }else{
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
        tag = tag.substring(7,tag.length); // cake
        tag = tag.charAt(0).toUpperCase() + tag.slice(1);
      }
      if(styles.indexOf(tag) !== -1){
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
  $('iframe[name="ace_outer"]').contents().find('#contextButtonsContainer').hide();
  if(e.evt.keyCode !== 13){
    clientVars.plugins.plugins.ep_context.crudeEnterCounter = 0;
  }
}

function reDrawControls(lineNumber){
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var controlsContainer = padOuter.find("#contextButtonsContainer")
  var select = controlsContainer.find(".context-selection");
  var controls = controlsContainer.find("#contextArrow, #newLineButton, #deleteLineButton");

  var line = padInner.contents().find("div").eq(lineNumber);
  var offsetTop = line[0].offsetTop || 0;
  var offsetHeight = line[0].offsetHeight /2;

  // Get the offset of the line
  var offset = offsetTop + offsetHeight;

  controlsContainer.show();
  controls.css("top", offset+"px");
  controls.data("lineNumber", lineNumber);
}

function reDrawContextOnLeft(cs, documentAttributeManager, rep){
  var padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
  var padOuter = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  var contextContainer = padOuter.find('#contextContainer');
  contextContainer.html("");


  // for each line
  var lines = padInner.contents().find("div");

  $.each(lines, function(k, line){

    // get offset and height
    var offsetTop = $(line)[0].offsetTop || 0
    var offsetHeight = $(line)[0].offsetHeight /2;
    var offset = offsetTop + offsetHeight;

    //get the line context
    var context = documentAttributeManager.getAttributeOnLine(k, 'context');
   
    if(context){
      // draw the context value on the screen
      contextContainer.append("<div class='contextLabel' style='top:"+offset+"px'>"+context+"</div>");
    }
  });



  // draw the context value on the screen
}

