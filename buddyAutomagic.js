// An attempt to make the Buddy/Mentoring/Tutor program 
// slightly more innovative

// INTRODUCTION
// Say we want to pair up two groups of people, international students and the
// local students, with respect to language skills, study level, interests and
// etc.  We set up an "affinity" score to estimate the affinity of a given
// pair, a high score indicates that the two persons will like each other.

// SET UP
// We set up a complete bipartite graph (https://en.wikipedia.org/wiki/Bipartite_graph) 
// with local students on one side and the international students on the other. 
// We assign the affinity scores as costs to the edges. Our goal:
// >   find a perfect matching that maximizes total affinity scores

// WARNING
// The following code does not necessarily follow best coding practices. It was
// written to test if pairing students this way could actually work out.
// A proper refactoring is definitely in order but will probably have to wait 
// until next Christmas 2013.

// Author: Ólafur Páll Geirsson (olafurpg@gmail.com)
// Thanks: Pétur Einarsson for constant feedback
//         Bjarki Ágúst Guðmundsson for network flow implementation,
//         Trausti Sæmundsson for facebook replace regex
//         Your name here? Try it out for your buddy/mentor program :)


// This is free software, free as in freedom. Feel free to edit it, reuse, 
// redistribute in any way you want. I ask you however to please contribute back
// to the project if you find it useful.

//////////////////////////////
//    ESN Buddies
//////////////////////////////
// TODO: TypeError: Cannot read property "htmlBody" from undefined.s
// TODO: exctract response sheet ids from spreadsheet
// TODO: locals and internationals must NOT be empty before "Copy responses"
// TODO: refactor fill out assignments, getQuestionKeys is not defined
// TODO: Convert appendix to question
// TODO: Possible recruits
// TODO: Pairing stats
// TODO: Clear non email sent or force match

// Your working spreadsheet
var ID = "0ApBBsTPBxGcMdHJkTy1xZ1l2RzJtNkdqYXhWZ0hTWkE";
// Locals data
var LOCAL_ID = "10XEMx2YNDyMHarSbS7m1GGsLDmJLOSjcfHMrrxwz4Ok";
// Internationals data
var INTERNATIONAL_ID = "1sYXYyGrpgG-trnubk_w2WUGc93uR7qf8Pos4bWT9B8w";

// Open up the spreadsheets containing your form responses and look at the url,
// it will be something like: 
//    https://docs.google.com/spreadsheet/ccc?key=0ApBBsTPBxGcMdHBRbEg0cTdkczFjcWw4d0RxdW53clE&usp=drive_web#gid=6
// Extract the key (e.g. "0ApBBsTPBxGcMdHBRbEg0cTdkczFjcWw4d0RxdW53clE" in this case) and 
// insert it here below. In the future this should become configurable through the spreadsheet

// TODO: Make generic
function getActiveSpreadsheet() {
//  Logger.log("Opening sheet id=%s", ID);
  return SpreadsheetApp.openById(ID);
}
// set up spreadsheet menu
function onOpen() {  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Opening Menu:\nSpreadsheet ID=%s\nOpened ID", ID);
  var menuEntries = [ 
    {name: "0. Run magic", functionName: "allInOne"},
    {name: "  a. Clear assignments", functionName: "clearNonAssignments"},
    {name: "  b. Prepare for magic", functionName: "copyResponses"},
    {name: "  c. Calculate affinity", functionName: "calcAffinities"},
    {name: "  d. Run network flow", functionName: "runNetworkFlow"},
    {name: "  e. Fill out assignments", functionName: "fillOutAssignments"},
    {name: "2. Test sending emails to yourself (highly recommended)", functionName: "sendOutAssignmentEmailsTest"},
    {name: "3. Send emails to buddies (confirmation required)", functionName: "sendOutAssignmentEmails"}
  ];
  //                     {name: "Send email to students", functionName: "sendEmails"}];
  ss.addMenu("Affinity", menuEntries);
}

function setSpreadsheetID(id) {
  ID = id;
}

function allInOne() {
  clearNonAssignments();
  copyResponses();
  if (!calcAffinities()) {
    return;
  }
  runNetworkFlow();
  fillOutAssignments();
  //  SpreadsheetApp.setActiveSheet(getActiveSpreadsheet().getSheetByName("Assignments"));
}

function clearNonAssignments() {
  var ss = getActiveSpreadsheet().getSheetByName("Assignments"),
      a = getSheetResponsesByName("Assignments", false, "Clearing");
  for (var i = 0, j = 0; i < a.length; i++) {
    //    Logger.log("%s: %s", i, a[i].emailSent);
    var count = 0;
    while (i + count < a.length && (a[i + count].forceMatch != "x" || a[i + count].emailSent != "x")) { 
      count++;
      //      Logger.log("Delete!");
    }
    if (count > 0) {
      ss.getRange(i + 2, 1, count, ss.getLastColumn()).clearContent();
      i += count;
    }
  }
}


/////////////////////////////
// Step 1. Prepare for magic
/////////////////////////////
function copyResponses() {
  var local = SpreadsheetApp.openById(LOCAL_ID),
      international = SpreadsheetApp.openById(INTERNATIONAL_ID),
      ss = getActiveSpreadsheet(),
      localR = local.getSheetByName("Form responses 1").getDataRange().getValues(),
      internationalR = international.getSheetByName("Form responses 1").getDataRange().getValues(),
      locals = ss.getSheetByName("Locals"),
      internationals = ss.getSheetByName("Internationals"),
      variables = ss.getSheetByName("Variables"),
      assignmentCounts = getAssignmentCounts(),
      id;
  
  locals.getRange(2, locals.getLastRow(), locals.getLastColumn()).clear({contentsOnly: true});
  internationals.getRange(2, internationals.getLastRow(), internationals.getLastColumn()).clear({contentsOnly: true});
  localR[0] = ["id"].concat(localR[0]).concat(["Assignments", "Capacity"]);
  for (var i = 1; i < localR.length; i++) {
    id = i - 1;
    var capacityLeft = assignmentCounts.localCapacity[id] - assignmentCounts.locals[id];
    localR[i] = [id.toFixed(0)].concat(localR[i]);
    if (typeof capacityLeft == "number") {
      localR[i] = localR[i].concat([assignmentCounts.locals[id], capacityLeft]);
    } else {
      localR[i] = localR[i].concat([0, "Run 'Prepare for magic' once more"]);
    }
    //    Logger.log("assignments=%s  capacity=%s", assignmentCounts.locals[id], capacityLeft);
    
    // Fix broken input
    for (var j = 0; j < localR.length; j++) {
      // Trim whitespace
      if (typeof localR[i][j] != "undefined") {
        localR[i][j] = localR[i][j].toString().trim();  // Trim all values in sheet
        // fix facebook url
        if (localR[0][j].toLowerCase().search("facebook") != -1) {
          localR[i][j] = correctFacebookLink(localR[i][j]);
        }
      }
    }
  }
  
  internationalR[0] = ["id"].concat(internationalR[0]);
  internationalR[0].push("Assignments");
  for (var i = 1; i < internationalR.length; i++) {
    id = i - 1;
    internationalR[i] = [id.toFixed(0)].concat(internationalR[i]);
    internationalR[i].push(assignmentCounts.internationals[i - 1]);
    for (var j = 0; j < localR.length; j++) {
      if (typeof internationalR[i][j] != "undefined") {
        internationalR[i][j] = internationalR[i][j].toString().trim();  // Trim all values in sheet
        if (internationalR[0][j].toLowerCase().search("facebook") != -1) {
          internationalR[i][j] = correctFacebookLink(internationalR[i][j]);
        }
      }
    }
  }
  locals.getRange(1, 1, localR.length, localR[0].length).setValues(localR);
  internationals.getRange(1, 1, internationalR.length, internationalR[0].length).setValues(internationalR);
  columns = [localR[0].concat(internationalR[0]).filter(uniq).sort()];
  variables.getRange(1, 1, columns.length, columns[0].length).setValues(columns);
  Logger.log(columns);
}

function updateAssignments() {
  
}

////////////////////////////////
// Step 2. Calculate affinities
////////////////////////////////
function calcAffinities() {
  // TODO: rename variables
  var internationals = getSheetResponsesByName("Internationals"),
      locals = getSheetResponsesByName("Locals"),
      assignments = getAssignmentCounts(),
      as = [],
      bs = [],
      la = assignments.locals,
      lc = assignments.localCapacity,
      ia = assignments.internationals,
      maxAssignments = 0, 
      input;
  
  while (true) {
    input = Browser.inputBox("What is the maximum allowed number of assignments per local buddy?");
    if (input == "cancel") { // User cancelled calculating affinities
      return false;
    } else { // User entered input
      input = parseInt(input, 10);
      if (isDigit(input)) {
        break;
      }
    }
  }
  maxAssignments = input;
  
  // Filter out already assigned buddies  
  for (var i = 0; i < locals.length; i++) {
    //    Logger.log(locals[i]);
    // local buddy is willing to take more buddies
    // local buddy won't be assigned to more than maxAssignents number of assignments
    if (locals[i].assignments  < maxAssignments && locals[i].capacity > 0) { 
      as.push(i);
    }
  }
  for (var i = 0; i < internationals.length; i++) {
    // exchange buddy has not been assigned an exchange buddy
    if (ia[i] == 0 && internationals[i].anyComments != "Cancelled") { 
      bs.push(i);
    }
  }
  
  //  Generate sheet
  var q = getQuestions(),
      qi = getQuestionImportances(),
      affinities = [],
      sheet = [],
      headRow = ["Local id", "Local name"],
      row = ["", ""];  // A1-B2 are empty
  for (var i = 0; i < bs.length; i++) { // exchange headers
    headRow.push("id-" + bs[i]); // id
    row.push(internationals[bs[i]].firstName); // name
  }
  sheet.push(headRow);
  sheet.push(row);
  for (var i = 0; i < as.length; i++) {
    var l = locals[as[i]]; // local
    row = [l.id, l.firstName];
    for (var j = 0; j < bs.length; j++) {
      var e = internationals[bs[j]]; // exchange
      var score = affinity(l, e, q, qi);
      row.push(score);
    }
    sheet.push(row);
    //    Logger.log(row.length + "  " + sheet[i].length);
  }
  // affinity sheet (as)
  var ss = getActiveSpreadsheet().getSheetByName("Affinity"); 
  ss.clear();
  var exchangeIds = []
  exchangeIds.push(["Exchange id"]);
  exchangeIds.push([""]);
  for (var i = 0; i < bs.length; i++) {
    exchangeIds.push([bs[i]]);
  }
  ss.getRange(1, 1, sheet.length, sheet[0].length).setValues(sheet);
  ss.getRange(1, ss.getLastColumn() + 1, exchangeIds.length).setValues(exchangeIds);
  return true;
}

///////////////////////////////////////////////////
// Step 3. Run network flow, i.e. magic from Bjarki
///////////////////////////////////////////////////
function runNetworkFlow() {
  var affinities = getSheetResponsesByName("Affinity", false),
      scores = [],
      exchangeIds = [],
      localIds = [];
  //  for (var i = 0`
  affinities.shift(); // remove header row
  //  Logger.log(affinities[1]);
  for (var i = 0; i < affinities.length; i++) {
    var row = affinities[i];
    for (var key in row) {
      //      Logger.log("Row key: " + key);
    }
    if (typeof(row.localId) == "number") { localIds.push(row.localId); }
    if (typeof(row.exchangeId) == "number") { exchangeIds.push(row.exchangeId); }
    
    //    Logger.log("Exchange id: ", row.exchangeId);
  }
  //  Logger.log(localIds);
  //  Logger.log("Exchange ids: ", exchangeIds);
  for (var i = 0; i < localIds.length; i++) {
    var row = affinities[i];
    scores[i] = [];
    for (var j = 0; j < exchangeIds.length; j++) {
      var col = "id" + exchangeIds[j];
      scores[i].push(row[col]);
      //      Logger.log(row[col]);
    }
  }
  //  Logger.log("row=%s cols=%s \nscore=%s", scores.length, scores[82].length, scores);
  
  // Magic, whoop whoop
  var flow = maxCostBipartiteMatching(scores);
  Logger.log(scores);
  //  Logger.log(flow);
  
  var k = Math.min(exchangeIds.length, localIds.length),
      fewerLocals = (exchangeIds.length > localIds.length),
      fewerInternationals = !fewerLocals,
      results = [];
  Logger.log(flow);
  
  Logger.log("k=%s", k);
  
  for (var i = 0; i < flow.length; i++) {
    var local = flow[i][0],
        international = flow[i][1];
    if (local < localIds.length && international < exchangeIds.length) {
      //      Logger.log(local + " " + international);
      //      Logger.log(localIds[local] + " " + exchangeIds[international]);
      results.push([localIds[local], exchangeIds[international]]);
    }
  }
  // affinity sheet (as)
  var ss = getActiveSpreadsheet().getSheetByName("Assignments"); 
  ss.getRange(ss.getLastRow() + 1, 4, results.length, results[0].length).setValues(results);
}

////////////////////////////////
// Step 4. Fill out assignments
////////////////////////////////

// TODO: Make more customizeable
// This function is what makes the "Assignments" spreadsheet pretty
function fillOutAssignments() {
  var assignments = getSheetResponsesByName("Assignments", false),
      ss = getActiveSpreadsheet().getSheetByName("Assignments"),
      internationals = getSheetResponsesByName("Internationals"),
      locals = getSheetResponsesByName("Locals"),
      qi = getQuestionImportances(),
      q = getQuestions(),
      //  var affinities = calcAffinities(locals, internationals);
      lid = "localId",
      eid = "exchangeId",
      range = [[]];
  Logger.log(locals);
  
  if (assignments.length == 0) {
    Browser.msgBox("There are no assignments to fill out");
    return;
  }
  
  // header
  var header = [
    "Affinity",
    "Local name", 
    "Exchange name",
    "Local ID",
    "Exchange ID",
    "Email sent",
    "Force Match"
  ];
  
  var startCol = header.length + 1;
  
  
  var colors = getColors(),
      lighten = true;
  
  // Add data and color
  for (var i = 0, col = startCol; i < q.length; i++, col++) {
    var question = q[i],
        color = colors[i],
        shade = 40,
        contrast = 10;
    
    // Header data
    header.push(question.name + " Score");
    
    // Question color
    ss.getRange(1, col, ss.getMaxRows()).setBackground(shadeColor(color, shade));
    //    Logger.log("%s: repr %s %s", question.name, typeof question.repr, question.repr);
    if (typeof question.repr == 'object') {
      header = header.concat(question.repr.header);
      for (var j = 0; j < question.repr.header.length; j++) {
        col += 1;
        if (lighten) {
          shade += contrast;
        } else {
          shade -= contrast;
        }
        lighten = !lighten;
        ss.getRange(1, col, ss.getMaxRows()).setBackground(shadeColor(color, shade));
        //        autoResizeCol(ss, col, 170);
      }
    }
  }
  
  // Add data and color bad cases
  for (var i = 0; i < assignments.length; i++) {
    var a = assignments[i],
        l = locals[a.localId],            // local buddy
        e = internationals[a.exchangeId], // exchange buddy
        row = [];
//    Logger.log(l);
//    if (l === undefined) continue;
//    Logger.log(e);
    row.push(affinity(l, e, q, qi));
    row.push(l.firstName + " " + l.lastName);
    row.push(e.firstName + " " + e.lastName);
    row.push(a.localId);
    row.push(a.exchangeId);
    if (a.emailSent) {
      row.push(a.emailSent);
    } else {
      row.push("");
    }
    if (a.forceMatch) {
      row.push(a.forceMatch);
    } else {
      row.push("");
    }
    
    for (var j = 0, col = startCol; j < q.length; j++, col++) {
      var question = q[j];
      // Color red if bad case
      if (typeof question.isBad == 'function' && typeof question.repr == 'object') {
        if (question.isBad(l, e)) {
          Logger.log("isbad %s %s", l.firstName, e.firstName);
          ss.getRange(i + 2, col, 1, 1 + question.repr.header.length).setBackground("red");
        }
      }
      row.push(question.importance(qi) * question.question(l, e, qi));
      if (typeof question.repr == 'object') {
        col += question.repr.header.length;
        row = row.concat(question.repr.data(l, e));
      }
    }
    //    for (var j = 0; j < appendix.length; j++) {
    //      row.push(l[appendix[j]]);
    //      row.push(e[appendix[j]]);
    //    }
    //    Logger.log("%s: %s", row.length, row);
    
    range.push(row);
  }
  range[0] = header;
  // Update Assignments sheet
  ss.getRange(1, 1, range.length, range[0].length).setValues(range);
  
  //  colorBadCases();
}
function autoResizeCol(ss, col, max) {
  ss.autoResizeColumn(col);
  ss.setColumnWidth(col, Math.min(max, ss.getColumnWidth(col) + 10));
}

///////////////////////////////
// Step 5, Assignment emails
////////////////////////////////
function sendOutAssignmentEmailsTest() {
  var email = Browser.inputBox("Which email would you like to direct assignments to?");
  if (email != "cancel") {
    sendOutAssignmentEmails(email);
  }
}

// Debug email messages, no input boxes
function sendOutAssignmentEmailsDebug() {
  // insert your email here
  var email = "XXX";
  sendOutAssignmentEmails(email, true);
}


function sendOutAssignmentEmails(outMail, debug) {
  debug = (typeof debug == "undefined") ? false : debug;
  Logger.log(outMail + debug);
  var assignments = getSheetResponsesByName("Assignments", false);
  var localMessage = getGmailDraftBySubject("Exchange buddy assignment");
  localMessage.htmlBody = decodeHtmlQuot(localMessage.htmlBody);
  var exchangeMessage = getGmailDraftBySubject("Local buddy assignment");
  exchangeMessage.htmlBody = decodeHtmlQuot(exchangeMessage.htmlBody);
  
//  Logger.log("local: %s \nexchange: %s", localMessage.htmlBody ,exchangeMessage.htmlBody);
  var MAX_EMAILS_TO_SEND = 500;
  var N = Math.min(MAX_EMAILS_TO_SEND, assignments.length); // as
  
  // Get confirmation to send out emails
  var n = 0; // count number of emails to be sent
  for (var i = 0; i < N; i++) {
    if (!assignments[i].emailSent) { // Email not already sent
      n++;
    }
  }
  Logger.log("n: %s", n);
  var emailString = (n == 1) ? "email" : "emails"; // singular or plural
  var message = "Are you sure you want to send out " + n*2 + " " + emailString + "?";
  // skip confirmation if we want
  var userWantsToSendOutEmails = (debug) ? true : confirmYesNo(message);
  
  if (!userWantsToSendOutEmails) {
    return; // cancel
  }
  Logger.log("Sending email(s)...");
  // It's been confirmed. We want to send out emails.
  var emailSent = [];
  for (var i = 0; i < assignments.length; i++) {
    var a = assignments[i];
    if (!a.emailSent) { // Email not already sent
      
      if (a.exchangeGender == "Male") {
        a["himher"] = "him";
        a["heshe"] = "he";
      } else if (a.exchangeGender == "Female") {
        a["himher"] = "her";
        a["heshe"] = "she";
      } else {
        a["himher"] = "him/her";
        a["heshe"] = "he/she";
      }
      
      var localBody = fillInTemplateFromObject(localMessage.htmlBody, a);
      var exchangeBody = fillInTemplateFromObject(exchangeMessage.htmlBody, a);
      
      Logger.log(localBody);
      var localOutMail = (typeof outMail != "undefined") ? outMail : a.localEmail,
          exchangeOutMail = (typeof outMail != "undefined") ? outMail : a.exchangeEmail;
      Logger.log("Outmail: %s", outMail);
      MailApp.sendEmail({  
        to: localOutMail, // l.emailAddress,
        subject: localMessage.subject,
        htmlBody: localBody,
        name: "ESN Reykjavik University",
        noReply: true,
        replyTo: "buddy@ru.esn.is"
      });
      Logger.log(exchangeBody);
      MailApp.sendEmail({  
        to: exchangeOutMail,
        subject: localMessage.subject,
        htmlBody: exchangeBody,
        name: "ESN Reykjavik University",
        noReply: true,
        replyTo: "buddy@ru.esn.is"
      });
    }
    if (!debug) {
      emailSent.push(["X"]);
    } else { // no X if we're debugging
      emailSent.push([""]);
    }
      
  }
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Assignments").getRange(2, 6, emailSent.length).setValues(emailSent);
  if (!debug) {
    Browser.msgBox("Successfully sent out " + n*2 + " emails!");
  }
}

