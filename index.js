var eejs = require('ep_etherpad-lite/node/eejs/');
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var sanitize = require('./sanitizer.js').sanitize;
var Security = require('ep_etherpad-lite/static/js/security'); 
var _encodeWhitespace = require('ep_etherpad-lite/node/utils/ExportHelper')._encodeWhitespace;

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
var stylesCSS = ["contexttitle{text-align:center;display:block;font-size:18px;line-height:20px;}",
  "contextwhereas::before{content: 'Whereas '}"];

/******************** 
* UI 
*/ 
exports.eejsBlock_editbarMenuLeft = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_context/templates/editbarButtons.ejs");
  return cb();
}

exports.eejsBlock_dd_format = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_context/templates/fileMenu.ejs");
  return cb();
}


/******************** 
* Editor
*/

// Allow <whatever> to be an attribute 
exports.aceAttribClasses = function(hook_name, attr, cb){
  attr.contextsection = 'tag:contextsection';
  cb(attr);
}

/******************** 
* Export
*/

// Include CSS for HTML export
exports.stylesForExport = function(hook, padId, cb){
  var css = "";
  stylesCSS.forEach(function(style){
    css += style;
  });
  cb(css);
};

// Add the props to be supported in export
exports.exportHtmlAdditionalTags = function(hook, pad, cb){
  cb(["contextsection"]);
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = function (hook, line) {
  var contextV = _analyzeLine(line.attribLine, line.apool);

  // If it has a context
  if(contextV){
    var contexts = contextV.split("$");
  }else{
    return line.lineContent +"<br>";
  }

  var before = "";
  var after = "";

  if (contexts.length) {
    contexts.forEach(function(contextV){
      before += "<context" + contextV + ">";
      after += "</context" + contextV + ">";
    });
    // Remove leading * else don't..
    var newString = before + line.lineContent.substring(1) + after + "<br>";
    return newString;
  }else{ // no context, nothing to remove
    return line.lineContent;
  }
}

// clean up HTML into something sane
exports.exportHTMLSend = function(hook, html, cb){
//  var blockElements = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];
  var blockElements = ["Sponsor", "Title", "Whereas", "Resolved", "Signature", "Date"];
  sanitize.exec(html, blockElements, function(error, cleanedHTML){
    cb(cleanedHTML);
  });
}

function _analyzeLine(alineAttrs, apool) {
  var context = null;
  if (alineAttrs) {
    var opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      var op = opIter.next();
      context = Changeset.opAttributeValue(op, 'context', apool);
    }
  }
  return context;
}
