var eejs = require('ep_etherpad-lite/node/eejs/');
var Changeset = require("ep_etherpad-lite/static/js/Changeset");
var sanitize = require('./sanitizer.js').sanitize;
var contexts = require("./static/js/contexts.js").contexts;
var generateCSSFromContexts = require("./static/js/contexts.js").generateCSSFromContexts;
var Security = require('ep_etherpad-lite/static/js/security');
var _encodeWhitespace = require('ep_etherpad-lite/node/utils/ExportHelper')._encodeWhitespace;
var async = require('../../src/node_modules/async');
var settings = require("ep_etherpad-lite/node/utils/Settings");
var request = require('request');

/********************
* UI and CSS
*/
exports.eejsBlock_editbarMenuLeft = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_context/templates/editbarButtons.ejs");
  return cb();
}

exports.eejsBlock_dd_format = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_context/templates/fileMenu.ejs");
  return cb();
}

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content = args.content + "<script src='../static/plugins/ep_context/static/js/contexts.js'></script>";
  return cb();
}

exports.eejsBlock_timesliderScripts = function (hook_name, args, cb) {
  args.content = args.content + "<script src='../../../static/plugins/ep_context/static/js/contexts.js'></script>";
  return cb();
}

exports.eejsBlock_timesliderBody = function(hook_name, args, cb){
  args.content = args.content + "<script>var head = $('body').append('<style>'+generateCSSFromContexts()+'</style>')</script>";
  return cb();
}
// timesliderStyles

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
  var stylesCSS = cssFromContexts();
  stylesCSS.forEach(function(style){
    css += "\n" + style;
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
    return line.lineContent + "<br>";
  }

  var before = "";
  var after = "";

  if (contexts.length) {
    contexts.forEach(function(contextV){
      if(contextV.indexOf("context") !== 0){
        before += "<p class='context context" + contextV + "'><span class='contextbefore'>";
      }else{
        before += "<p class='" + contextV + "'>";
      }

      // TODO, ensure this is not hard coded..  Impossible to parse CSS prolly so need a decent solution
      if(contextV === "whereas"){
        before += "WHEREAS, "
        after += ", and";
      }
      if(contextV === "firstresolved"){
        before += "Be it resolved, "
        after += ", and";
      }
      if(contextV === "resolved"){
        before += "Be It Further Resolved, "
        after += ", and";
      }
      if(contextV === "lastresolved"){
        before += "And finally it is resolved, "
      }
      if(contextV === "lastwhereas"){
        before += "WHEREAS, "
        after += "; now, therefore,"
      }

      before += "</span>"

      after += "</p>";
    });
    // Remove leading * else don't..
    var newString = before + line.lineContent.substring(1) + "<span class='contextafter'>" + after + "</span>" + "<br>";
    return newString;
  }else{ // no context, nothing to remove
    return line.lineContent;
  }
}

// clean up HTML into something sane
exports.exportHTMLSend = function(hook, html, cb){
  var blockElements = ["Sponsor", "Title", "Whereas", "Resolved", "Signature", "Date", "LastWhereas", "LastResolved", "FirstResolved"];
  console.warn("um okay");
  sanitize.exec(html, blockElements, function(error, cleanedHTML){
    console.warn(cleanHTML);
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


function cssFromContexts(){
  var formattedCSS = [];
  for(var prop in contexts){
    var context = contexts[prop];
    if(context.css){
      var css = ".context"+prop+"{"+context.css+"};";
      console.log("pushed");
      formattedCSS.push(css);
    }
  }
  return formattedCSS;
}

exports.expressCreateServer = function (hook_name, args, callback) {
  args.app.get(/\/p\/.*\/contexts/, function(req, res) {
    console.warn("Grabbing JSON blob from Madison");
    var fullURL = req.protocol + "://" + req.get('host') + req.url;
    var path=req.url.split("/");
    var padId=path[2];
    var param = path[3].split("=");
    var action = param[0];
    var actionId = param[1];
    var padURL = req.protocol + "://" + req.get('host') + "/p/" +padId;
    var apiEndpoint = "https://editor.mymadison.io/api/docs/"+padId+"/context";

    if(!settings.ep_api_auth || settings.ep_api_auth.fake){
      console.error("No settings set for api auth access");
      apiEndpoint = "http://127.0.0.1/context.json";
      settings.ep_api_auth = {};
      settings.ep_api_auth.fake = true;
    }

    // Get the current document.
    var documentOptions = {
      uri: apiEndpoint,
      method: settings.ep_api_auth.method ? settings.ep_api_auth.method : 'GET',
      json: true,
      headers : {
        Cookie: getAsUriParameters(req.cookies)
      }
    };
    request(documentOptions, function(e,r,styles){
      res.setHeader('Content-Type', 'application/json');
      res.send(styles);
    });

/*
    async.waterfall(
      [
        function(cb) {
          request(documentOptions, function(e,r,styles){
          }).promise().done(;
          cb(null, styles)

        },
        function(cb, styles){
          cb(null, styles);
        }
      ],
      function(err, results){
        console.log("results", results);
        res.send(results + padId);
      }
    );
*/
  });
}


function getAsUriParameters(data) {
  var url = '';
  for (var prop in data) {
    url += encodeURIComponent(prop) + '=' + encodeURIComponent(data[prop]) + '; ';
  }
  return url.substring(0, url.length - 1)
}

