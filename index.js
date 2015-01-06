var eejs = require('ep_etherpad-lite/node/eejs/');
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var sanitize = require('./sanitizer.js').sanitize;

var stylesCSS = ["contextparagraph{margin-left:10px;color:green;}",
  "contextform{text-align:center;display:block;}",
  "contextsection > contextheader, contextsection > contextenum{text-align:center;display:block;}",
  "contextenum{font-weight:bolder;}",
  "contextheader{font-weight:bolder;}",
  "contextcongress{font-variant: small-caps;}",
  "contextsession{font-variant: small-caps;}",
  "contextsubsection{margin-left:15px;color:blue;}",
  "contextdistribution-code{text-align:right;display:block;}"]


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
  attr.sub = 'tag:sub';
  attr.sup = 'tag:sup';
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
  cb(["sub", "sup"]);
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = function (hook, line) {
  var contextV = _analyzeLine(line.attribLine, line.apool);
  if(contextV){
    var contexts = contextV.split("$");
  }else{
    return;
  }
  var before = "";
  var after = "";
  if (contexts.length) {
    contexts.forEach(function(contextV){
      before += "<context" + contextV + ">";
      after += "</context" + contextV + ">";
    });
    return before + line.text.substring(1) + after + "<br>";
  }else{
  }
}

// clean up HTML into something sane
exports.exportHTMLSend = function(hook, html, cb){
  var blockElements = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];
  console.log(sanitize);
  sanitize.exec(html, blockElements, function(error, cleanedHTML){
    console.log(cleanedHTML);
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
