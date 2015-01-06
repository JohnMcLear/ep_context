// var cheerio = require('../../src/node_modules/cheerio');
/* TLDR; Strips superfluos HTML elements
Turns:
<contextForm><contextDistribution-code>IIB</contextDistribution-code></contextForm> <contextForm></contextForm> <contextForm><contextCongress>13th CONGRESS</contextForm>

or
<a><b>hello</b></a>
<a>World</a>
<a>Yo</a>

Into:
<contextForm>
  <contextDistribution-code>
     IIB
  </contextDistribution-code>
  <contextCongress>
     13th CONGRESS
  </contextCongress>
<contextForm>

or

<a><b>hello</b>
World
Yo</a>
*/

var test = '<body> <contextForm><contextDistribution-code>IIB</contextForm></contextDistribution-code><br> <contextForm></contextForm><br> <contextForm><contextCongress>13th CONGRESS</contextForm></contextCongress><br> <contextForm><contextSession>2d session</contextForm></contextSession><br> <contextForm></contextForm><br> <contextForm>H.R 2126</contextForm><br>.....<br><br> <contextSection><contextHeader><contextSection>Section 101. Short tit...</contextSection></contextHeader></contextSection><br> <contextSection><contextSection> This act may.,...</contextSection></contextSection><br> <contextSection></contextSection><br> <contextSection><contextEnum><contextSection><contextEnum>Title I</contextSection></contextEnum></contextSection></contextEnum><br> <contextSection><contextSection></contextSection></contextSection><br> <contextSection><contextHeader>Better Buildings</contextSection></contextHeader><br> <contextSection><contextHeader><contextSection></contextSection></contextHeader></contextSection><br> <contextSection><contextSection>Sec. 102. Energy....</contextSection></contextSection><br> <contextSection><contextSection></contextSection></contextSection><br> <contextSection><contextSection>(a) Definitions.--</contextSection></contextSection><br> <contextSection><contextSection>In this section:</contextSection></contextSection><br> <contextSection><contextSection>    Administrator.--</contextSection></contextSection><br> <contextSection><contextSection>The term ....</contextSection></contextSection><br> <contextSection><contextSection></contextSection></contextSection><br><br></body>';

// var $ = cheerio.load(test);

// Turn what look like line breaks into something we can delim
// needs testing
// test = test.split("> <").join(">LINEBREAK<");
var styles = ["Section", "Paragraph", "Subsection", "Form", "Distribution-code", "Congress", "Session", "Header", "Enum"];

// Remove blank lines that have single context..  Just a simple one to get us started..
// Bad idea, no need to exit these..
/*
styles.forEach(function(style){
  style = "context"+style;
  var toRemove = "<"+style+"></"+style+">";
  var re = new RegExp(toRemove, 'gi');
  test = test.replace(re, '\n');
});
*/

// Split document into array of lines
var lines = test.split("<br>");
var contexts = {};

// Go over each line and build a multidimensional object of each lines elements
lines.forEach(function(line, lineNumber){
  var re = /<(.*?)\>/gmi;
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

    // 0 is opening
    // 1 is keep open
    // 2 is closing 
    // 3 is open and closing  
  }
});

console.log(contexts);

// next job is to go through each of the line contexts (contexts) and look at the next line to see if it includes it..
// we might need to look at the previous line too, to see if that includes it, not sure why though..

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
        if (prevLine && prevLine[prop] === 1){
          // set this line to open only..
          if(contexts[line]){
            contexts[line][prop] = 2; // set it to closed
          }
        }
      }
    }
  }
  
};

console.log(contexts);
