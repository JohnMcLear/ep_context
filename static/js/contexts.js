// Before is the string before ALL items that have this context
// After is the same as above but after..
// first only applies to the first item with this context
// last only applies to the last item with this context
// second only applies to the seocnd item with this context
// beforelast only applies to the penultimate item with this context


/**********
// Suggested CSS should we go down the route of parsing CSS?

.contextresolved{
  displayName: Resolved;
  color:red;
}
.contextresolved::before{

}
.contextresolved::after{

}
// Will below work?
.contextresolved:nth-child(2):after{
  content: "foo";
}
********/

try{
  exports.generateCSSFromContexts = generateCSSFromContexts;
}catch(e){
  // no drama :)
}

function generateCSSFromContexts(contexts){
  // We're operating on the server so there are no clientVars
  if(typeof clientVars !== 'undefined'){
    var isClient = true;
  }
  if(isClient){
    clientVars.plugins.plugins.ep_context.stylePrefixArray = [];
    clientVars.plugins.plugins.ep_context.stylePrefixes = [];
  }

  if(!contexts){
    console.warn("no contexts when there probably should be?", contexts);
    return;
  }
  // console.log("contexts", typeof contexts, contexts);
  var cssItems = []; // For all contexts

  // We need to understand why this is sometimes required, removing it breaks timeslider..
  if(contexts.context) contexts = contexts.context;

  Object.keys(contexts).forEach(function(id){
    var context = contexts[id];
    console.log("context", context);
    // console.log("context", typeof context, context);
    var idCssItems = []; // Specific to this context, will get squashed soon
    if(typeof context !== "object") return;
    Object.keys(context).forEach(function(position){
      var rules = context[position];
      if(position === "displayName") return;
      // These guys provide basic CSS rules for a context
      if(position === "css" || position === "after" || position === "before"){
        
        // For autocompletion we have to store the pre-given string in an array..
        if(position === "before"){
          if(isClient){
            clientVars.plugins.plugins.ep_context.stylePrefixArray.push(rules.content);
            clientVars.plugins.plugins.ep_context.stylePrefixes.push(id);
          }
        }
        
        if(position === "css"){
          idCssItems.push("context"+id+" { "+rules+ ";}");
          idCssItems.push("contextfirst"+id+" { "+rules+ ";}");
          idCssItems.push("contextsecond"+id+" { "+rules+ ";}");
          idCssItems.push("contextbeforelast"+id+" { "+rules+ ";}");
          idCssItems.push("contextlast"+id+" { "+rules+ ";}");

          // Note to self, we use block elems in the editor and we use
          // Spans with classes in export.  Witness me.
          idCssItems.push(".context"+id+" { "+rules+ ";}");
          idCssItems.push(".contextfirst"+id+" { "+rules+ ";}");
          idCssItems.push(".contextsecond"+id+" { "+rules+ ";}");
          idCssItems.push(".contextbeforelast"+id+" { "+rules+ ";}");
          idCssItems.push(".contextlast"+id+" { "+rules+ ";}");
        }
        if(position === "after"){
          idCssItems.push("context"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push("contextfirst"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push("contextsecond"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push("contextbeforelast"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push("contextlast"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push(".context"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push(".contextfirst"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push(".contextsecond"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push(".contextbeforelast"+id+"::after { content: '"+rules.content+ "';}");
          idCssItems.push(".contextlast"+id+"::after { content: '"+rules.content+ "';}");
        }
        if(position === "before"){
          idCssItems.push("context"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push("contextfirst"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push("contextsecond"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push("contextbeforelast"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push("contextlast"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push(".context"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push(".contextfirst"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push(".contextsecond"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push(".contextbeforelast"+id+"::before { content: '"+rules.content+ "';}");
          idCssItems.push(".contextlast"+id+"::before { content: '"+rules.content+ "';}");
        }
      }else{
        // This is a bit more tricky due to different data structures
        // Basically these guys handle all other edge cases like first/last item styling

        Object.keys(rules).forEach(function(type){
          var rule = rules[type];
          if(type === "css"){
            idCssItems.push("context"+position+id+" { "+rule+ "; }");
          }else{
            if(type === "before"){
              idCssItems.push("context"+position+id+"::before { content: '"+rule.content+ "';}");
            }
            if(type === "after"){
              idCssItems.push("context"+position+id+"::after { content: '"+rule.content+ "';}");
            }
          }
        });

      }

    });
    // console.log("idCSSItems", idCssItems);
    idCssItems = idCssItems.join("\n");
    cssItems.push(idCssItems);

  });
  var cssString = cssItems.join("\n");
  return cssString;
}


