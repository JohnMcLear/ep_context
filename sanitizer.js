/** ****

 TLDR; Strips superfluos HTML elements

Example
Turns:
<contextForm><contextDistribution-code>IIB</contextDistribution-code></contextForm> <contextForm></contextForm> <contextForm><contextCongress>13th CONGRESS</contextForm>

Into:
<contextForm>
  <contextDistribution-code>
     IIB
  </contextDistribution-code>
  <contextCongress>
     13th CONGRESS
  </contextCongress>
<contextForm>

Usage..

var sanitize = require("./sanitize.js").sanitize;

sanitize.exec(html, [blockElements], function(error, cleanedHTML){
  console.log(cleanedHTML);
});

sanitize.exec("<contextForm>bla</contextForm>", ["contextForm", "contextSection"], function(error, cleanedHTML){
  console.log(cleanedHTML);
});

**************/

exports.sanitize = {
  exec(html, blockElements, cb) {
    const _this = this;
    exports.sanitize.blockElements = blockElements;
    _this.splitAndFlatten(html, (err, contexts, lines) => {
      _this.getOpenAndClose(contexts, (err, openAndClosed) => {
        _this.rebuildHTML(openAndClosed, html, lines, (err, cleanedHTML) => {
          cb(err, cleanedHTML);
        });
      });
    });
  },
  splitAndFlatten(html, callback) {
    // Split document into array of lines
    const prefix = html.split('<body>');
    const suffix = html.split('</body>');
    exports.sanitize.prefix = `${prefix[0]}<body>`;
    exports.sanitize.suffix = `</body>${suffix[1]}`;
    html = prefix[1];
    html = html.split('</body>')[0];
    const lines = html.split('<br>');
    const contexts = {};
    const err = null;

    // 0 is opening
    // 1 is keep open
    // 2 is closing
    // 3 is open and closing

    // Go over each line and build a multidimensional object of each lines elements
    lines.forEach((line, lineNumber) => {
      const re = /<(.*?)\>/gmi; // gets everything inbetween <> IE <foo> == foo
      contexts[lineNumber] = {};

      while ((m = re.exec(line)) != null) {
        // m[1] is not in array return
        const prop = m[1].charAt(0).toUpperCase() + m[1].slice(1);
        if (exports.sanitize.blockElements.indexOf(prop) == -1) return;

        if (m.index === re.lastIndex) {
          re.lastIndex++;
        }
        // View your result using the m-variable.
        // eg m[0] etc.
        if (m[1]) {
          let elementName = m[1];
          const isOpening = m[1].indexOf('/') !== 0;

          // opening
          if (isOpening) {
            contexts[lineNumber][elementName] = 0;
          } else { // closing
            elementName = elementName.substring(1, elementName.length);
            // if its already open
            if (contexts[lineNumber][elementName] === 0) {
              contexts[lineNumber][elementName] = 3;
            }
          }
        }
      }
    });
    callback(err, contexts, lines);
  },
  getOpenAndClose(contexts, callback) {
    for (let line in contexts) {
      line = parseInt(line);
      const prevLine = contexts[line - 1];
      const thisLine = contexts[line];
      const nextLine = contexts[line + 1];

      // for each property..
      for (const prop in thisLine) {
        // If we're handling these blocks
        //        if(exports.sanitize.blockElements.indexOf(prop) !== -1){
        if (thisLine[prop] === 3) { // if its open and close
          // Does the next line have this context?
          if (nextLine[prop] == 3) {
            // set this line to open only..
            if (contexts[line] && contexts[line][prop]) {
              contexts[line][prop] = 0;
            }
          }
        }

        if (thisLine[prop] === 0) { // if its opening
          // Does the prev line have this context open already?
          if ((prevLine && prevLine[prop] == 0) || (prevLine && prevLine[prop] == 1)) {
            // set this line to open only..
            if (contexts[line]) {
              contexts[line][prop] = 1; // set it to keep open
            }
          }
        }

        if (thisLine[prop] === 3) { // if its opening and closing
          // Does the next line keep this context?
          if ((!nextLine || !nextLine[prop])) {
            if (prevLine && (prevLine[prop] === 1 || prevLine[prop] === 0)) {
              // set this line to open only..
              if (contexts[line]) {
                contexts[line][prop] = 2; // set it to closed
              }
            }
          }
        }
        //        }
      }
    }
    callback(null, contexts);
  },
  rebuildHTML(contexts, html, lines, callback) {
    let properties = [];

    // Build an array of contexts we are processing
    for (var line in contexts) {
      var line = contexts[line];
      for (const prop in line) {
        properties.push(prop);
      }
    }

    // Flatten array down to unique values
    properties = properties.filter(exports.sanitize.onlyUnique); // returns ['a', 1, 2, '1']

    // Go through each line and remove references to contexts
    lines.forEach((line, lineNumber) => {
      properties.forEach((prop) => {
        const startStr = `\<${prop}\>`;
        const endStr = `\</${prop}\>`;
        const re = new RegExp(startStr, 'g');
        lines[lineNumber] = lines[lineNumber].replace(re, '');
        const re2 = new RegExp(endStr, 'g');
        lines[lineNumber] = lines[lineNumber].replace(re2, '');
      });

      // remove leading white space
      if (lines[lineNumber].substring(0, 1) === ' ') {
        lines[lineNumber] = lines[lineNumber].substring(1, lines[lineNumber].length);
      } else {
        lines[lineNumber] = lines[lineNumber].substring(0, lines[lineNumber].length);
      }

      // Note that this leaves in the leading * which is probably unintended
    });

    // Go through each line and add the context
    for (var line in contexts) { // for each context
      var lineNumber = line;
      var line = contexts[line];
      // prefxies any required context
      // we have to do this in reverse
      exports.sanitize.reverseForIn(line, (prop) => {
        // 0 is opening
        // 1 is keep open
        // 2 is closing
        // 3 is open and closing
        const propValue = line[prop];
        const blockElements = exports.sanitize.blockElements;
        const fullPropValue = prop.substring(7, propValue.length);
        if (blockElements.indexOf(fullPropValue) === -1) return; // only process elements we support
        if (propValue === 0) {
          lines[lineNumber] = `<${prop}>${lines[lineNumber]}`;
        }
        if (propValue === 2) {
          lines[lineNumber] = `${lines[lineNumber]}</${prop}>`;
        }
        if (propValue === 3) {
          lines[lineNumber] = `<${prop}>${lines[lineNumber]}</${prop}>`;
        }
      });
    }
    lines = lines.join('\n<br>');

    lines = exports.sanitize.prefix + lines + exports.sanitize.suffix;
    callback(null, lines);
  },
  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  },
  escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
  },
  reverseForIn(obj, f) {
    const arr = [];
    for (const key in obj) {
      // add hasOwnPropertyCheck if needed
      arr.push(key);
    }
    for (let i = arr.length - 1; i >= 0; i--) {
      f.call(obj, arr[i]);
    }
  },
};
