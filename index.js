const eejs = require('ep_etherpad-lite/node/eejs/');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const sanitize = require('./sanitizer.js').sanitize;
const contexts = require('./static/js/contexts.js').contexts;
const generateCSSFromContexts = require('./static/js/contexts.js').generateCSSFromContexts;
const Security = require('ep_etherpad-lite/static/js/security');
const _encodeWhitespace = require('ep_etherpad-lite/node/utils/ExportHelper')._encodeWhitespace;

/*
var stylesCSS = [".contextTitle{text-align:center;display:block;font-size:18px;line-height:20px;}\n",
  ".contexttitle{text-align:center;display:block;font-size:18px;line-height:20px;}\n",
  "br{display:none}\n"
];
*/

/** ******************
* UI and CSS
*/
exports.eejsBlock_editbarMenuLeft = function (hook_name, args, cb) {
  args.content += eejs.require('ep_context/templates/editbarButtons.ejs');
  return cb();
};

exports.eejsBlock_dd_format = function (hook_name, args, cb) {
  args.content += eejs.require('ep_context/templates/fileMenu.ejs');
  return cb();
};

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content += "<script src='../static/plugins/ep_context/static/js/contexts.js'></script>";
  return cb();
};

exports.eejsBlock_timesliderScripts = function (hook_name, args, cb) {
  args.content += "<script src='../../../static/plugins/ep_context/static/js/contexts.js'></script>";
  return cb();
};

exports.eejsBlock_timesliderBody = function (hook_name, args, cb) {
  args.content += "<script>var head = $('body').append('<style>'+generateCSSFromContexts()+'</style>')</script>";
  return cb();
};
// timesliderStyles

/** ******************
* Editor
*/

// Allow <whatever> to be an attribute
exports.aceAttribClasses = function (hook_name, attr, cb) {
  attr.contextsection = 'tag:contextsection';
  cb(attr);
};

/** ******************
* Export
*/

// Include CSS for HTML export
exports.stylesForExport = function (hook, padId, cb) {
  let css = '';
  const stylesCSS = cssFromContexts();
  stylesCSS.forEach((style) => {
    css += `\n${style}`;
  });
  cb(css);
};

// Add the props to be supported in export
exports.exportHtmlAdditionalTags = function (hook, pad, cb) {
  cb(['contextsection']);
};

// line, apool,attribLine,text
exports.getLineHTMLForExport = function (hook, context) {
  const contextV = _analyzeLine(context.attribLine, context.apool);

  // If it has a context
  if (contextV) {
    var contexts = contextV.split('$');
  } else {
    context.lineContent += '<br>';
    return true;
  }

  let before = '';
  let after = '';

  if (contexts.length) {
    contexts.forEach((contextV) => {
      if (contextV.indexOf('context') !== 0) {
        before += `<p class='context context${contextV}'><span class='contextbefore'>`;
      } else {
        before += `<p class='${contextV}'>`;
      }

      // TODO, ensure this is not hard coded..  Impossible to parse CSS prolly so need a decent solution
      if (contextV === 'whereas') {
        before += 'WHEREAS, ';
        after += ', and';
      }
      if (contextV === 'firstresolved') {
        before += 'Be it resolved, ';
        after += ', and';
      }
      if (contextV === 'resolved') {
        before += 'Be It Further Resolved, ';
        after += ', and';
      }
      if (contextV === 'lastresolved') {
        before += 'And finally it is resolved, ';
      }
      if (contextV === 'lastwhereas') {
        before += 'WHEREAS, ';
        after += '; now, therefore,';
      }

      before += '</span>';

      after += '</p>';
    });
    // Remove leading * else don't..
    if (context.lineContent[0] === '*') {
      context.lineContent = context.lineContent.substring(1);
    }
    context.lineContent = `${before + context.lineContent}<span class='contextafter'>${after}</span>` + '<br>';
    return true;
  }
  return true;
};

// clean up HTML into something sane
exports.exportHTMLSend = function (hook, html, cb) {
  const blockElements = ['Sponsor', 'Title', 'Whereas', 'Resolved', 'Signature', 'Date', 'LastWhereas', 'LastResolved', 'FirstResolved'];
  console.warn('um okay');
  sanitize.exec(html, blockElements, (error, cleanedHTML) => {
    console.warn(cleanHTML);
    cb(cleanedHTML);
  });
};

function _analyzeLine(alineAttrs, apool) {
  let context = null;
  if (alineAttrs) {
    const opIter = Changeset.opIterator(alineAttrs);
    if (opIter.hasNext()) {
      const op = opIter.next();
      context = Changeset.opAttributeValue(op, 'context', apool);
    }
  }
  return context;
}


function cssFromContexts() {
  const formattedCSS = [];
  for (const prop in contexts) {
    const context = contexts[prop];
    if (context.css) {
      const css = `.context${prop}{${context.css}};`;
      console.log('pushed');
      formattedCSS.push(css);
    }
  }
  return formattedCSS;
}
