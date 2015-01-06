/******

 TLDR; Strips superfluos HTML elements

Example
Turns:
<contextForm><contextDistribution-code>IIB</contextDistribution-code></contextForm> <contextForm></contextForm> <contextForm><contextCongress>13th CONGRESS</contextForm>

    // 0 is opening
    // 1 is keep open
    // 2 is closing
    // 3 is open and closing
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
  exec: function(html, blockElements, cb){
    var _this = this;
    _this.splitAndFlatten(html, blockElements, function(err, contexts, lines){
      console.log("contexts", contexts);
      _this.getOpenAndClose(contexts, blockElements, function(err, openAndClosed){
        _this.rebuildHTML(openAndClosed, html, lines, function(err, cleanedHTML){
          cb(err, cleanedHTML);
        });
      })
    })
  },
  splitAndFlatten: function(html, blockElements, callback){
    // Split document into array of lines
    var lines = html.split("<br>");
    var contexts = {};
    var err = null;

    // 0 is opening
    // 1 is keep open
    // 2 is closing
    // 3 is open and closing

    // Go over each line and build a multidimensional object of each lines elements
    lines.forEach(function(line, lineNumber){
      var re = /<(.*?)\>/gmi; // gets everything inbetween <> IE <foo> == foo
      contexts[lineNumber] = {};

      while ((m = re.exec(line)) != null) {
        if (m.index === re.lastIndex) {
          re.lastIndex++;
        }
        // View your result using the m-variable.
        // eg m[0] etc.
        if(m[1]){
          var elementName = m[1];
          var isOpening = m[1].indexOf("/") !== 0;

          //opening
          if(isOpening){
            contexts[lineNumber][elementName] = 0
          }
          else{ // closing
            elementName = elementName.substring(1,elementName.length);
            // if its already open
            if(contexts[lineNumber][elementName] === 0){
              contexts[lineNumber][elementName] = 3
            }
          }
        }
      }
    });
    callback(err, contexts, lines);
  },
  getOpenAndClose: function(contexts, blockElements, callback){
    for (var line in contexts) {
      line = parseInt(line);
      var prevLine = contexts[line-1];
      var thisLine = contexts[line];
      var nextLine = contexts[line+1];

      // for each property..
      for (var prop in thisLine){

        if(thisLine[prop] === 3){ // if its open and close
          // Does the next line have this context?
          if(nextLine[prop] == 3){
            // set this line to open only..
            if(contexts[line] && contexts[line][prop]){
              // console.log("boob", contexts[line][prop]);
              contexts[line][prop] = 0;
            }
          }
        }

        if(thisLine[prop] === 0){ // if its opening
          // Does the prev line have this context open already?
          if((prevLine && prevLine[prop] == 0) || (prevLine && prevLine[prop] == 1)){
            // set this line to open only..
            if(contexts[line]){
              contexts[line][prop] = 1; // set it to keep open
            }
          }
        }

        if(thisLine[prop] === 3){ // if its opening and closing
          // Does the next line keep this context?
          if( (!nextLine || !nextLine[prop])){
            if (prevLine && (prevLine[prop] === 1 || prevLine[prop] === 0)){
              // set this line to open only..
              if(contexts[line]){
                contexts[line][prop] = 2; // set it to closed
              }
            }
          }
        }
      }
    }
    callback(null, contexts)
  },
  rebuildHTML: function(contexts, html, lines, callback){
    var properties = [];

    // Build an array of contexts we are processing
    for (var line in contexts) {
      var line = contexts[line];
      for(var prop in line){
        properties.push(prop);
      }
    }

    // Flatten array down to unique values
    properties = properties.filter( exports.sanitize.onlyUnique ); // returns ['a', 1, 2, '1']

    // Go through each line and remove references to contexts
    lines.forEach(function(line, lineNumber){
      properties.forEach(function(prop){
        var startStr = "\<"+prop+"\>";
        var endStr = "\</"+prop+"\>";
        var re = new RegExp(startStr, 'g');
        lines[lineNumber] = lines[lineNumber].replace(re, "");
        var re2 = new RegExp(endStr, 'g');
        lines[lineNumber] = lines[lineNumber].replace(re2, "");
      });
    });

    // Go through each line and add the context
    for(var line in contexts){ // for each context
      var lineNumber = line;
      var line = contexts[line];
      // prefxies any required context
      // we have to do this in reverse
      exports.sanitize.reverseForIn(line, function(prop){
        // 0 is opening
        // 1 is keep open
        // 2 is closing
        // 3 is open and closing
        var propValue = line[prop];
        if(propValue === 0){
          lines[lineNumber] = "<"+prop+">"+lines[lineNumber];
        }
        if(propValue === 2){
          lines[lineNumber] = lines[lineNumber]+"</"+prop+">"
        }
        if(propValue === 3){
          lines[lineNumber] = "<"+prop+">"+lines[lineNumber]+"</"+prop+">";
        }
        
      });

    };
  
    lines = lines.join("<br>")
    callback(null, lines);

  },
  onlyUnique: function(value, index, self) { 
    return self.indexOf(value) === index;
  },
  escapeRegExp: function(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  },
  reverseForIn: function(obj, f) {
    var arr = [];
    for (var key in obj) {
      // add hasOwnPropertyCheck if needed
      arr.push(key);
    }
    for (var i=arr.length-1; i>=0; i--) {
      f.call(obj, arr[i]);
    }
  }

}

// var html = '<body> <contextForm><contextDistribution-code>IIB</contextForm></contextDistribution-code><br> <contextForm></contextForm><br> <contextForm><contextCongress>13th CONGRESS</contextForm></contextCongress><br> <contextForm><contextSession>2d session</contextForm></contextSession><br> <contextForm></contextForm><br> <contextForm>H.R 2126</contextForm><br>.....<br><br> <contextSection><contextHeader><contextSection>Section 101. Short tit...</contextSection></contextHeader></contextSection><br> <contextSection><contextSection> This act may.,...</contextSection></contextSection><br> <contextSection></contextSection><br> <contextSection><contextEnum><contextSection><contextEnum>Title I</contextSection></contextEnum></contextSection></contextEnum><br> <contextSection><contextSection></contextSection></contextSection><br> <contextSection><contextHeader>Better Buildings</contextSection></contextHeader><br> <contextSection><contextHeader><contextSection></contextSection></contextHeader></contextSection><br> <contextSection><contextSection>Sec. 102. Energy....</contextSection></contextSection><br> <contextSection><contextSection></contextSection></contextSection><br> <contextSection><contextSection>(a) Definitions.--</contextSection></contextSection><br> <contextSection><contextSection>In this section:</contextSection></contextSection><br> <contextSection><contextSection>    Administrator.--</contextSection></contextSection><br> <contextSection><contextSection>The term ....</contextSection></contextSection><br> <contextSection><contextSection></contextSection></contextSection><br><br></body>';
// var blockElements = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];

/*
exports.sanitize.exec(html, blockElements, function(err, cleanedHTML){
  console.log(err, cleanedHTML);
});
*/
