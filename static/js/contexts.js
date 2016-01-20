// This file should be modified to include formatting and styling of your contexts.. 

// This is where you should add contexts too, you will note that each context is a big
// json blob.  Contexts are powerful things, be careful of dragons..

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

var contexts = {
  whereas: {
    displayName: "Whereas",
    css: "color:green",
    before: {
      content: "Whereas"
    },
    after: {
      content: "; and ,"
    }
  },
  signature: {
    displayName: "Signature",
    css: "color:blue"
  },
  resolved: {
    displayName: "Resolved",
    css: "color:red",
    before: {
      content: "Be it resolved"
    },
    after: {
      content: " AND "
    },
    first: {
      css: "font-size:12px",
      before:{
	content: "Be it resolved"
      },
      after:{
	content: "sdfsdf"
      }
    },
    last: {
      css: "font-size:9px",
      before:{
	content: "Be it further resolved"
      },
      after:{
	content: "sdfsdf"
      }
    },
    second: {
      css: "font-size:12px",
      before:{
	content: "sdfsdf"
      },
      after:{
	content: "sdfsdf"
      }
    },
    beforelast: {
      css: "font-size:12px",
      before:{
	content: "sdfsdf"
      },
      after:{
	content: "sdfsdf"
      }
    }
  }
}
