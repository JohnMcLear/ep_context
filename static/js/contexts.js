// This file should be modified to include formatting and styling of your contexts..

// This is where you should add contexts too, you will note that each context is a big
// json blob.  Contexts are powerful things, be careful of dragons..

// Before is the string before ALL items that have this context
// After is the same as above but after..
// first only applies to the first item with this context
// last only applies to the last item with this context
// second only applies to the seocnd item with this context
// beforelast only applies to the penultimate item with this context


/** ********
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

var contexts = {
  signature: {

  },
  title: {
    css: 'font-size:24px; line-height:32px;',
  },
  whereas: {
    displayName: 'Whereas',
    css: 'color:green',
    before: {
      content: 'Whereas',
    },
    after: {
      content: '; and ,',
    },
  },
  resolved: {
    displayName: 'Resolved',
    css: 'color:red',
    before: {
      content: 'Be it resolved',
    },
    after: {
      content: ' AND ',
    },
    first: {
      css: 'font-size:12px',
      before: {
        content: 'Be it resolved',
      },
      after: {
        content: 'sdfsdf',
      },
    },
    last: {
      css: 'font-size:9px',
      before: {
        content: 'Be it further resolved',
      },
      after: {
        content: 'sdfsdf',
      },
    },
    second: {
      css: 'font-size:12px',
      before: {
        content: 'sdfsdf',
      },
      after: {
        content: 'sdfsdf',
      },
    },
    beforelast: {
      css: 'font-size:12px',
      before: {
        content: 'sdfsdf',
      },
      after: {
        content: 'sdfsdf',
      },
    },
  },
};
try {
  exports.contexts = contexts;
  exports.generateCSSFromContexts = generateCSSFromContexts;
} catch (e) {
  // no drama :)
}

function generateCSSFromContexts() {
  const cssItems = []; // For all contexts
  $.each(contexts, (id, context) => {
    let idCssItems = []; // Specific to this context, will get squashed soon
    $.each(context, (position, rules) => {
      if (position === 'displayName') return;

      // These guys provide basic CSS rules for a context
      if (position === 'css' || position === 'after' || position === 'before') {
        if (position === 'css') {
          idCssItems.push(`context${id} { ${rules};}`);
          idCssItems.push(`contextfirst${id} { ${rules};}`);
          idCssItems.push(`contextsecond${id} { ${rules};}`);
          idCssItems.push(`contextbeforelast${id} { ${rules};}`);
          idCssItems.push(`contextlast${id} { ${rules};}`);
        }
        if (position === 'after') {
          idCssItems.push(`context${id}::after { content: '${rules.content}';}`);
          idCssItems.push(`contextfirst${id}::after { content: '${rules.content}';}`);
          idCssItems.push(`contextsecond${id}::after { content: '${rules.content}';}`);
          idCssItems.push(`contextbeforelast${id}::after { content: '${rules.content}';}`);
          idCssItems.push(`contextlast${id}::after { content: '${rules.content}';}`);
        }
        if (position === 'before') {
          idCssItems.push(`context${id}::before { content: '${rules.content}';}`);
          idCssItems.push(`contextfirst${id}::before { content: '${rules.content}';}`);
          idCssItems.push(`contextsecond${id}::before { content: '${rules.content}';}`);
          idCssItems.push(`contextbeforelast${id}::before { content: '${rules.content}';}`);
          idCssItems.push(`contextlast${id}::before { content: '${rules.content}';}`);
        }
      } else {
        // This is a bit more tricky due to different data structures
        // Basically these guys handle all other edge cases like first/last item styling
        $.each(rules, (type, rule) => {
          if (type === 'css') {
            idCssItems.push(`context${position}${id} { ${rule}; }`);
          } else {
            if (type === 'before') {
              idCssItems.push(`context${position}${id}::before { content: '${rule.content}';}`);
            }
            if (type === 'after') {
              idCssItems.push(`context${position}${id}::after { content: '${rule.content}';}`);
            }
          }
        });
      }
    });
    // console.log("idCSSItems", idCssItems);
    idCssItems = idCssItems.join('\n');
    cssItems.push(idCssItems);
  });
  const cssString = cssItems.join('\n');
  return cssString;
}
