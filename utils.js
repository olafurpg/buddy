/////////////////////////
//   Utility functions
/////////////////////////

// generate array of javascript objects from spreadsheet
// the keys are the header values and the values are the cell values
// play around with this function to see what how it works
function getSheetResponsesByName(sheetName, addVar, msg) {
  
  addVar = (typeof addVar == "undefined") ? true : addVar;
  // TODO: Using the cache might be fun, but it's generating some random bugs
  //  var cache = CacheService.getPublicCache(),
  //      request = sheetName + "-" + addVar;
  //  if (typeof msg != "undefined") {
  //    request = request + "-" + msg;
  //  }
  //  Logger.log(request);
  //  
  //  var cached = cache.get(request);
  //  if (cached != null) {
  //    return JSON.parse(cached);
  //  }
  
  var addVar = (typeof addVar !== 'undefined') ? addVar : true,
      ss = getActiveSpreadsheet(),
      sheet = ss.getSheetByName(sheetName),
      responses = getResponses(sheet);
  
//  cache.put(request, JSON.stringify(responses), 20);
  if (!addVar) {
    return responses;
  } else {
    return addVariables(responses);
  }
}

function getResponses(sheet) {
  var range = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn());
  var objects = getRowsData(sheet, range)
  return objects;
};

// get size of object. 
// Example:
//   {key1: val1, key2: val2}.size() => 2
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

// Extracts keys from object. 
// Example:
//   getKeys({key1: val1, key2: val2}) => ["key1", "key2"]
function getKeys(obj)
{
  var keys = [];
  
  for(var key in obj)
  {
    if(obj.hasOwnProperty(key))
    {
      keys.push(key);
    }
  }
  
  return keys;
}

// returns a list of unique elements in array a
// Example: 
//   [1,1,2,2,3,3,4].filter(uniq) => [1,2,3,4]
function uniq(value, index, self) { 
  return self.indexOf(value) === index;
}

// Extends responses from locals and internationals with defined variables, e.g.
// instead of having to access the response to the question
// "Where would you like your buddy to come from? (1st choice)"
// we can use the the defined varibles in the spreadsheet instead
// This should allow the user to change the how questions are phrased in the form
// without having to touch any code
function addVariables(responses) {
  var vars = getResponses(getActiveSpreadsheet().getSheetByName("Variables"))[0];
  //  Logger.log(vars);
  for (var i = 0; i < responses.length; i++) {
    var r = responses[i],
        o = {},
        rev = {};
    for (var key in r) {
      var val = vars[key];
//      Logger.log(key);
      if (!o.hasOwnProperty(val)) {
        o[val] = r[key]; // defined variable, in sheet
        o[key] = r[key]; // original question
        //        if (key == "Exchange id") {
        //        }
          
        // TODO: necessary? We can probably implement this in a better way
        rev[r[key]] = key;
      } else { // List question, such as interests
        if (o[val].toString() != "[object Object]") {
          var left = rev[o[val]],
              right = o[val];
          //          Logger.log(o[val] + " " + left + ": " + right)
          o[val] = {};
          o[val][left] = right;
        }
        o[val][key] =  r[key];
      }
    }
    //    Logger.log(o);
    responses[i] = o;
  }
  return responses;
}


// esnreykjavik's oAuth 2.0 Bitly access token. Please use your own
// if you think you'll be generating a lot of short urls!
function bitlyToken() { 
  return "b43c97922ec89536110ec0f01e034c2f141ac486";
}

// How many more emails can I send through MailApp? Current max is 500/day
//function dailyQuotaLeft() {
//  Logger.log("Remaining daily quota: " + MailApp.getRemainingDailyQuota()); 
//}


// Display a dialog box with the message `s` and "Yes" and "No" buttons.
function confirmYesNo(s) {
  var click = Browser.msgBox(s, Browser.Buttons.YES_NO);
  if (click == "yes") {
    return true;
    //   Logger.log('The user clicked "Yes."');
  } else {
    return false;
    //   Logger.log('The user clicked "No" or the dialog\'s close button.');
  }
}

// debugging
function logAffinities(As, Bs, affinities, spreadsheet) {
  var affinityName = "Affinity";
  var ss = spreadsheet || getActiveSpreadsheet();
  var as = ss.getSheetByName(affinityName); // affinity sheet (as)
  as.clear();
  var sheet = []; 
  var headRow = ["", ""];  // A1-B2 are empty
  var row = ["", ""];
  for (var i = 0; i < affinities[0].length; i++) {
    headRow.push(i);
    row.push(Bs[i].firstName);
  }
  sheet.push(headRow);
  sheet.push(row);
  for (var i = 0; i < affinities.length; i++) { // for 
    row = [i, As[i].firstName].concat(affinities[i]);
    sheet.push(row);
  }
  Logger.log(sheet);
  Logger.log(sheet.length + " " + sheet[0].length);
  // Update sheet with new affinity values
  //  var v = r.getValues();
  //  Logger.log(v.length + " " + v[0].length);
}

// utility function
function decodeHtmlQuot(html) {
  return html.replace(/\$\{&quot;/g, '${"').replace(/&quot;\}/g, '"}');
}

// We want to be able to quickly spot any 'unfortunate' pairings,
// such as when a gender preference is not met or country preference is not met
function colorBadCases() {
  var assignments = getSheetResponsesByName("Assignments");
  var internationals = getSheetResponsesByName("Internationals");
  var locals = getSheetResponsesByName("Locals");
  var ss = getActiveSpreadsheet().getSheetByName("Assignments");
  var q = getQuestionKeys();
  copyHeaderBackground("Assignments"); // clear out any red cells
  for (var i = 0; i < assignments.length; i++) {
    var a = assignments[i];
    //    if (!a.emailSent) { // Email not already sent
    var l = locals[a.localId];
    var e = internationals[a.exchangeId];
    // Variables for email templates
    l.buddyName = e.firstName + " " + e.lastName;
    l.buddyCountry = e.whichIsTheCountryOfYourHomeUniversity;
    l.buddyEmail = e.emailAddress;
    e.buddyName = l.firstName + " " + l.lastName;
    e.buddyEmail = l.emailAddress;
    if (!gotPreferredCountry(l, e, q)) {
      // Color country preferences red
      ss.getRange(i + 2, 9, 1, 4).setBackground("red");
      Logger.log(e.buddyName + " - " + l.buddyName + " (bad match)");
    }
    if (l[q.genderPref] != "No preference" && l[q.genderPref] != e.gender) {
      ss.getRange(i + 2, 7, 1, 2).setBackground("red");
    }
    //    }
  }
  //  getActiveSpreadsheet().getSheetByName("Assignments").getRange(2, 3, range.length, range[0].length).setValues(range);
}

// Update buddy assignment counts, how many exchange buddies each local buddy has received 
function getAssignmentCounts() {
  var assignments = getSheetResponsesByName("Assignments", false, "Counts");
  var internationals = getSheetResponsesByName("Internationals", true, "Counts");
  var locals = getSheetResponsesByName("Locals", true, "Counts");
  var localAssignments = [];
  var localCapacity = [];
  var exchangeAssignments = [];
  for (var i = 0; i < locals.length; i++) {
    localCapacity.push(capacity(locals[i].willingness));
    localAssignments.push(0);
  }
  for (var i = 0; i < internationals.length; i++) {
    exchangeAssignments[i] = 0;
  }
  for (var i = 0; i < assignments.length; i++) {
    var a = assignments[i];
    Logger.log("assignemnt: %s", a);
    localAssignments[a.localId]++;
    exchangeAssignments[a.exchangeId]++;
  }
  //  for (var i = 0; i < exchangeAssignments.length; i++) {
  //    Logger.log(i + ": " + exchangeAssignments[i]); 
  //    Logger.log(i + ": " + localAssignments[i]); 
  //  }
  return {locals: localAssignments, localCapacity: localCapacity, internationals: exchangeAssignments}; 
}

// Return all colums to original color
function copyHeaderBackground(sheetName) {
  var ss = getActiveSpreadsheet().getSheetByName(sheetName);
  var header = ss.getRange(1,1,1,ss.getLastColumn());
  var bg = header.getBackgrounds(); // copyFormatToRange(ss, 1, ss.getLastColumn(), 1, ss.getLastRow()); // 
  for (var i = 1; i < ss.getLastRow(); i++) {
    bg.push(bg[0].slice(0)); // copy color
  }
  //  Logger.log(header.getHeight() + "  " + header.getWidth());
  //  Logger.log(bg.length + " " + bg[0].length);
  var body = ss.getRange(1, 1, ss.getLastRow(), ss.getLastColumn());
  //  Logger.log(body.getHeight() + "  " + body.getLastColumn());
  body.setBackgrounds(bg);
}


// My eyes are bleeding too
function replaceBuddyFamilyString(body, familyName, intro, locals, internationals, assignments) {
  if (familyName) {
    var s = intro + "<div><br/><strong>" + familyName + "</strong><div>";
    var fam = getFamily(locals, familyName);
    for (var i = 0; i < fam.length; i++) {
      if (fam.length <= 1) break; // alone in family
      var l = fam[i];
      //      Logger.log(l);
      for (var j = 0; j < assignments.length; j++) { // for all assignments
        var a = assignments[j];
        if (a.localId == l.id) { // if same local buddy
          var e = internationals[a.exchangeId]; // matched exchange buddy
          //          Logger.log(e);
          s += "<blockquote>" + 
            l.firstName + " " + l.lastName + " (" + l.whereDoYouComeFrom + ") + " +  // local
              e.firstName + " " + e.lastName + " (" + e.whichIsTheCountryOfYourHomeUniversity + ")" + // exchange student
                "</blockquote>";
        }
      }
    }
    s += "</div></div>";
    //    Logger.log("\n" + s);
    
    return body.replace("BUDDYFAMILY", "<div>" + s + "</div>");;
  }
  return body.replace("BUDDYFAMILY", "")
}

// Thanks to Trausti, allows the users to input either facebook username or facebook link
function getFacebookLink(facebook, name) {
  return "<a href='" + correctFacebookLink(facebook, name) + "'>" + name + "</a>";
}

function correctFacebookLink(facebook, name){
  var original = facebook;
  var w = /\s/;
  if (!facebook || typeof facebook == "undefined") {
    return "Did not specify"; // no url
  }
  facebook = facebook.trim();
  var tail = facebook.replace(/(http|https):\/\/(www\.)?facebook\.com\//, "");
  tail = tail.replace(/(www\.)?facebook\.com\//, "");
  if (!facebook) {
    Logger.log("Invalid facebooklink=(" + original + ")");
    return; // invalid url
  }
  
  var link = "http://www.facebook.com/" + tail;
  Logger.log("Successfully changed: " + original + " to: " + link);
  return link;
}

function replaceDiv(str, label, name, value) {
  return str.replace(label, "<br/><strong>" + name + ":</strong> " + value + "");
}

// We log every outgoing email into our "database", i.e. the sheet 'Email log' hehe
function sendEmail(message) {
//  MailApp.sendEmail(message);
  logEmail(message);
}

function logEmail(message) {
  var sheet = getActiveSpreadsheet().getSheetByName("Email log");
  logMsg(sheet, message.to, message.subject, message.htmlBody);
}

// Logs a sent email to logSheet
function logMsg(logSheet, emailAddr, subject, body) {
  var dataRow = [new Date().toTimeString(), emailAddr, subject, body];
  logSheet.appendRow(dataRow);
  Logger.log("Success, email logged!" + 
             "\nTimestamp: " + dataRow[0] +
             "\nEmail: " + emailAddr +
             "\nSubject: " + subject + 
             "\nBody: " + body);
}

function testAddVar() {
  getSheetResponsesByName("Locals");
}


// debugging utility
function logResponses(responses) {
  for(var i in responses) {
    var response = responses[i];
    var s = "";
    s = "\n" + i + ": Response from " + response["firstName"] + " " + response["lastName"] + "\n";
    for (var key in response) {
      s += key + " -> " + response[key] + "\n";
    }
    Logger.log(s);
  }
}

// utility function to profile running time
function profile(k, As, Bs) {
  var bef = new Date().getSeconds();
  //  Logger.log("k=%s Before", k);
  //  MailApp.sendEmail("olafurpg@gmail.com", "Affinity", s);
  //  Logger.log(ir.length + "  " + lr.length);
  //  Logger.log(range);
  var affinities = calcAffinities(As, Bs, k);
  var flow = maxCostBipartiteMatching(affinities);  
  var aft = new Date().getSeconds();
  
  //  Logger.log("k=%s After diff=%s", k, aft - bef);
}

// Merge two arrays (keys,values) into one object
// Example:
//    getObject([1,2], ['a', 'b']) => {1: 'a', 2: 'b'}
// Does not seem to be used anywhere
function getObject(ids, o) {
  var O = {};
  if (ids.length != o.length) { // Incompatible lengths
    return {};
  }
  for (var i = 0; i < ids.length; i++) {
    O[normalizeHeader(ids[i])] = o[i];
  }
  return O;
}

/* 
 * Borrowed from http://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript
 * 
 * finds the intersection of 
 * two arrays in a simple fashion.  
 *
 * PARAMS
 *  a - first array, must already be sorted
 *  b - second array, must already be sorted
 *
 * NOTES
 *
 *  Should have O(n) operations, where n is 
 *    n = MIN(a.length(), b.length())
 */
function intersect(a, b)
{
  var ai=0, bi=0;
  var result = new Array();

  while( ai < a.length && bi < b.length )
  {
     if      (a[ai] < b[bi] ){ ai++; }
     else if (a[ai] > b[bi] ){ bi++; }
     else /* they're equal */
     {
       result.push(a[ai]);
       ai++;
       bi++;
     }
  }

  return result;
}

// TODO: remove slice(20) if method is 
//       used elsewhere than in interest.repr
function intersectObjectsOnValue(value, A, B) {
  var intersection = [];
  for (var key in A.interest) {
    if (A.interest.hasOwnProperty(key) && B.interest.hasOwnProperty(key)) {
      if (A.interest[key].search(value) != -1 && B.interest[key].search(value) != -1) {
        intersection.push(key.slice(20));
      }
    }
  }
  return intersection;
}

// TODO: remove slice(20) if method is 
//       used elsewhere than in interest.repr
function unionObjectsOnValue(value, A, B) {
  var intersection = [];
  for (var key in A.interest) {
    if (A.interest.hasOwnProperty(key) && B.interest.hasOwnProperty(key)) {
      if (A.interest[key].search(value) != -1 || B.interest[key].search(value) != -1) {
        intersection.push(key.slice(20));
      }
    }
  }
  return intersection;
}

// TODO; can you make a prettier palette?
//       Try yourself: http://color.hailpixel.com/
function getColors() {
  return [
    "#62a6cb",
    "#c27447",
    "#5438a8",
    "#b83d8d",
    "#206058",
    "#b8a33d",
    "#632126",
    "#6ac0cd",
    "#369933",
    "#265D73",
    "#C7BC57",
    "#5BC8C8",
    "#8a62cb",
    "#85D686",
    "#B4563C"
    ];
}

/*
 * Borrowed from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
 * If you pass in 100 for percent it will make your color pure white. 
 * If you pass in 0 for percent, nothing will happen. If you pass in 
 * 1 for percent it will add 3 shades to all colors (2.55 shades per 1%,
 * rounded). So your really passing in a percentage of white (or black, use negative). 
 */
function shadeColor(color, percent) {   
    var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// Returns a gmail draft with the given subject
// Makes it possible to compose emails in gmail and
// send through here, just make sure the subjects match
function getGmailDraftBySubject(subject) {
  var drafts = GmailApp.getDraftMessages(); // TODO: cache
  for (var i = 0; i < drafts.length; i++) {
    var m = drafts[i];
    //    Logger.log("Subject: %s\nBody: %s", m.getSubject(), m.getBody()); 
    if (m.getSubject() == subject) {
      return { subject: m.getSubject(), htmlBody: m.getBody() };
    }
  }
}
