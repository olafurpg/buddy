/////////////////////
// Question
/////////////////////

var Questions = {
    hello: "Hello"
}
// Which questions are we using in this program?
function getQuestions() {
  return [
    genderQuestion(),
    ageQuestion(),
    countryPreferenceQuestion(),
    studyLevelQuestion(),
    facultyQuestion(),
    languageQuestion(),
    interestQuestion(),
    motivationQuestion(),
    arrivaltimeQuestion(),
    willingnessQuestion(),
    appendixQuestion()
  ];
}

function getQuestionImportances() {
  var ss = getActiveSpreadsheet().getSheetByName("Question Importances");
  return getResponses(ss)[0];
}

// Calculates the affinity between local A and international student B
// affinity |əˈfɪnɪti| noun ( pl. affinities )
// a natural liking for and understanding of someone or something
// Returns integer value: high value == high affinity
function affinity(A, B, questions, qi) {
  var affinity = 0;
//  Logger.log("Calculating affinity(%s, %s)", A.firstName, B.firstName);
  for (var i = 0; i < questions.length; i++) {
    var question = questions[i];
    var result = Math.round(question.importance(qi) * question.question(A, B, qi));
    if (result === undefined || isNaN(result)) {
      Logger.log("Invalid question: " + question.name);
      continue;
    }
//    Logger.log("%s: %s", question.name, result);
    affinity += result;
  }
  // Shouldn't happen, but, you know
  // ...
  // it's javascript
  if (affinity === undefined || isNaN(affinity)) { return 0; }
  return affinity;
}

///////////////////
// Implementations
///////////////////

// Question members
// `name`: Name of question
// `importance`: Returns affinity
// `question`: Calculates score for
//  given local/international pair
//    Arguments
//     - A: response from local
//     - B: reponse from international

// Gender
function genderQuestion() {
  return {
    name: "Gender",
    importance: function (qi) {
      return qi.genderPreference;
    },
    question: function (A, B) {
      if (!noPref(A.genderPref) && A.genderPref != B.gender) {
        return -1;
      } else {
        return (A.genderPref == B.gender) ? 1 : 0;
      }
    },
    isBad: function (A, B) {
      return !(noPref(A.genderPref) || A.genderPref == B.gender);
    },
    repr: {
      header: [
        "Gender Preference",
        "Exchange Gender"
      ],
      data: function(A, B) {
        return [
          A.genderPref,
          B.gender
        ];
      }
    }
  };
}

// Age Question
function ageQuestion() {
  return {
    name: "Age",
    importance: function (qi) {
      return qi.age;
    },
    question: function (A, B) {
      var maxDiff = 5,
          maxSquared = maxDiff * maxDiff;

      return (maxSquared - Math.pow(Math.min(Math.abs(A.age - B.age), maxDiff), 2)) / maxSquared;
    },
    isBad: function (A, B) {
      return Math.abs(A.age - B.age) > 4;
    },
    repr: {
      header: [
        "Age difference",
        "Local Age",
        "Exchange Age"
      ],
      data: function(A, B) {
        return [
          Math.abs(A.age - B.age),
          A.age,
          B.age
        ];
      }
    }
  }
}

// Country preferences
function countryPreferenceQuestion() {
  return {
    name: "Country pref",
    // we might want to reconsider the question framework here
    // it might be easier to simply skip the importance member,
    // or make it optional
    importance: function (qi) {
      // All preferences are the same
      return qi.countryPreference1;
    },
    question: function (A, B) {
      // TODO: pref1 vs. pref2 and pref3
      // TODO: ignore undefined
      if (!gotPreferredCountry(A, B)) {
        return -1;
      } else {
        return Math.max(
          countryPreference(A.pref1, B.exchangeHomeCountry),
          countryPreference(A.pref2, B.exchangeHomeCountry),
          countryPreference(A.pref3, B.exchangeHomeCountry));
      }
    },
    isBad: function (A, B) {
//      Logger.log("Is bad: %s %s", A, B);
      return !gotPreferredCountry(A, B);
    },
    repr: {
      header: [
        "Exchange Nationality",
        "Pref 1",
        "Pref 2",
        "Pref 3",
      ],
        data: function(A, B) {
        return [
        B.exchangeHomeCountry,
        A.pref1,
        A.pref2,
        A.pref3
      ];
    }
  }
}
}

// Study level
function studyLevelQuestion() {
  return {
    name: "Study Level",
    importance: function (qi) {
      return qi.studyLevel;
    },
    question: function (A, B) {
      return studyLevel(A.studyLevel, B.studyLevel);
    },
    repr: {
      header: [
        "Local level",
        "Exchange level"
      ],
      data: function(A, B) {
        return [
          A.studyLevel,
          B.studyLevel
        ];
      }
    }
  }
}

// Faculty
function facultyQuestion() {
  return {
    name: "Faculty",
    importance: function (qi) {
      return qi.faculty;
    },
    question: function (A, B) {
      return faculty(A.faculty, B.faculty);
    },
    repr: {
      header: [
        "Local faculty",
        "Exchange faculty"
      ],
      data: function(A, B) {
        return [
          A.faculty,
          B.faculty
        ];
      }
    }
  }
}
function testScope() {
  var foo = function() {
    return "Hello!";
  }
  return {
    test: function() {
      Logger.log(foo());
    }
  }
}

function testFoo() {
  testScope().test();
}

// Languages in common
function languageQuestion() {
  var languagesInCommon = function(A, B) {
    if (A && B) {
      var inCommon = intersect(
        A.languages.split(", "),
        B.languages.split(", ")
      );
      if (inCommon.length != 0) {
        return inCommon.join(", ");
      }
    }
    return ["None"];
  }
  return {
    name: "Languages",
    importance: function (qi) {
      return qi.languagesInCommon;
    },
    question: function (A, B) {
      var score = language(A.languages, B.languages);
//      if (A.motivation == "Practice my language skills") {
//        score *= 2;
//      }
      return score * score;
    },
    isBad: function(A, B) {
      return languagesInCommon(A, B)[0] == "None";
    },
    repr: {
      header: [
        "Languages in common"
      ],
      data: function(A, B) {
        return languagesInCommon(A,B);
      }
    }
  }
}

// Interests
function interestQuestion() {
  return {
    name: "Interests",
    importance: function (qi) {
      return qi.interests;
    },
    question: function (A, B) {
      //      Logger.log(A.interest);
      var score = 0;
      for (var key in A.interest) {
        var result = interest2(A.interest[key], B.interest[key]);
//        Logger.log(key + ": " + result);
        score += result;
      }
      return score;
    },
    repr: {
      header: [
        "Interests in common (both love)"
      ],
      data: function(A, B) {
        var inCommonLove = intersectObjectsOnValue("I love it", A, B),
            result = inCommonLove; // != 0) ? inCommonLove : inCommonEitherLove;
        //         inCommonEitherLove = unionObjectsOnValue("I love it", A, B),
        return (result.length != 0) ? result.join(", ") : ["None provided"];
      }
    }
  }
}

// Arrival time
// TODO: Make more configurable
function arrivaltimeQuestion() {
  return {
    name: "Arrival time",
    importance: function(qi) {
      return qi.arrivaltime;
    },
    question: function(A, B) {
      if (!B.arrivaltime) {
        return 0; // no time
      }
      date = new Date(B.arrivaltime);
      if (daysFromNow(date) < 14) { // two weeks from now
        return 1;
      } else {
        return 0;
      }
    },
    repr: {
      header: [
//        "Days until arrival",
        "Arrives on"
      ],
      data: function(A, B) {
        if (typeof B.arrivaltime != "undefined") {
          return [B.arrivaltime];
          //          var days = Math.round(daysFromNow(B.arrivaltime));
            //          ];
            //              days
        } else {
          return ["Did not specify"];
        }
      }
    }
  };
}

// Willingness
function willingnessQuestion() {
  return {
    name: "Willingness",
    importance: function(qi) {
      return qi.willingness;
    },
    question: function(A, B) {
      var cap = capacity(A.willingness) - 1;
      return cap * cap;
    },
    repr: {
      header: [
        "Would you be interested in having more than one buddy?"
      ],
      data: function(A, B) {
        if (typeof A.willingness != "undefined") {
          return [A.willingness];
        } else {
          return ["Did not specify"];
        }
      }
    }
  };
}

// Motivation
function motivationQuestion() {
  return {
    name: "Motivation",
    importance: function(qi) {
      return qi.motivation;
    },
    question: function(A, B, qi) {
      var q;
      switch (A.motivation) {
        case "Practice my language skills":
          q = languageQuestion();
          break;
//          return q.question(A, B) * q.;
        case "Meet new interesting people":
          q = interestQuestion();
          break;
        case "Help out":
          return 140;
        default: // we ignore this question
          q = appendixQuestion();
      }
      return q.question(A, B) * q.importance(qi);
    },
    repr: {
      header: [
        "Motivation"
      ],
      data: function(A, B) {
        if (typeof A.motivation != "undefined") {
          return [A.motivation];
        } else {
          return ["Did not specify"];
        }
      }
    }
  };
}

// Appendix
function appendixQuestion() {
  return {
    name: "Appendix",
    importance: function(qi) {
      return 0;
    },
    question: function(A, B) {
      return 0;
    },
    repr: {
      header: [
        "Local Email",
        "Exchange Email",
        "Local Facebook",
        "Exchange Facebook",
        "Local Phone",
        "Exchange Phone"
      ],
      data: function(A, B) {
        return [
          A.email,
          B.email,
          A.facebook,
          B.facebook,
          A.phone,
          B.phone
        ];
      }
    }
  };
}


//////////////
// Utilities
//////////////

function testInterestQuestion() {
  var locals = getSheetResponsesByName("Locals");
  var internationals = getSheetResponsesByName("Internationals");
  var result = interestQuestion().question(locals[0], internationals[1]);
  Logger.log(result);
}


// For now, we will have to do with the following questions
function capacity(response) {
  switch (response) {
    case "Cancelled":
      return 0;
    case "No, I am happy with having one buddy":
      return 1;
    case "Yes, but not more than two":
      return 2;
    case "Yes, I love being a buddy!":
      return 3;
    default:
      return 1; // Did not respond
  }
  return 1; // TODO: necessary?
}

function noPref(pref) {
  return pref == "" || pref == "No preference" || pref == undefined;
}

function gotPreferredCountry(A, B) {
  var country = B.exchangeHomeCountry;
  if (country == "Other") {
    return true;
  }
  //  Logger.log(A[q.pref1] + "  " + A[q.pref2] + " " + A[q.pref3] + " + " + country);
  if (noPref(A.pref1) || A.pref1 == country) return true;
  if (noPref(A.pref2) || A.pref2 == country) return true;
  if (A.pref3 == country) return true;
  // if you preferred two or three countries but got none
  return false;
}

function daysFromNow(day) {
  var one_day = 1000 * 60 * 60 * 24; // milliseconds
  return (day.getTime() - new Date().getTime()) / one_day;
}

function arrivalTest() {
  var internationals = getSheetResponsesByName("Internationals");
  var q = getQuestionKeys();
  var at = internationals[2][q.arrivalTime];
  var arriving = new Date(at);
  var today = new Date();
  Logger.log(daysFromNow(arriving, today));
}




function faculty(A, B) {
  return (A == B) ? 1 : 0; // Full score if equal, 0 otherwise
}

function getStudyLevel(A) {
  switch (A) {
    case "Undergraduate":
      return 0;
    case "Graduate":
      return 1;
    case "Phd":
      return 2;
  }
  // Either respondent did not answer question
  // or the above case statements do not apply
}

// Full score if the same
// Half score if difference is 1
// 0 if one is an undergrad and the other is a phd student
// or if either user did not answer this question
function studyLevel(A, B) {
  var Alevel = getStudyLevel(A);
  var Blevel = getStudyLevel(B);
  if (A && B) { // If both buddies answered questions
    return 2 - Math.abs(Alevel - Blevel);
  } else {
    return 0; // Either A or B did not answer question
  }
}

function studyTest() {
  var a = "Graduate";
  var b = "Phd";
  var c = undefined;
  if (c || c) {
    Logger.log("Undefined");
  }
  Logger.log(getStudyLevel(a) + "  " + getStudyLevel(b));
  Logger.log(studyLevel(a, b));
}

function getLangs(A) {
  if (!A) {
    return "None";
  }
  var langs = A.split(",");
  //  langs.map(String.prototype.trim); // Clear leading and trailing whitespace
  for (var i = 0; i < langs.length; i++) { // Why won't you allow a simple map???
    langs[i] = langs[i].replace(/^\s+|\s+$/g,'');
  }
  return langs;
}

function language(A, B) {
  var aLangs = getLangs(A);
  var bLangs = getLangs(B);

  if (!aLangs || !bLangs) { // either A or B did not answer question
    return 0;
  }
  //  Logger.log(aLangs);
  //  Logger.log(bLangs);
  var score = 0; // 1 point for ever same language spoken

  //  Iterate through all pairs of langages
  for (var i = 0; i < aLangs.length; i++) {
    if (bLangs.indexOf(aLangs[i]) !== -1) { // both speak same language
      score = score + 1;
      //      Logger.log(aLangs[i]);
    }
  }
  return score;
}


function interestRate2(A) {
  switch (A) {
    case "It's fun":
      return 1;
    case "I love it":
      return 2;
    case "Not important": // we dismiss this interest
    default:
      return;
  }
}

function interest2(A, B) {
  //  Logger.log(A + "  " + B);
  var aRate = interestRate2(A);
  var bRate = interestRate2(B);
  if (!aRate || !bRate) {
    return 0;
  } else {
    return Math.pow(aRate + bRate - 1, 2);
  }
}

// score for how many languages A and B have in common
function languageTest() {
  var a = "English, Finnish, German, Spanish, Swedish";
  var b = "Chinese (Mandarin), Danish, English, German, Icelandic, Swedish";
  Logger.log(language(a, b)); // Returns 3
}

// Deprecated, see @interestRate2
function interestRate(A) {
  switch (A) {
    case "I hate it":
      return 0;
    case "It's not my thing":
      return 1;
    case "It's alright":
      return 2;
    case "It's fun":
      return 3;
    case "I love it":
      return 4;
    default:
      return;
  }
}

// Deprecated, see @interest2
function interest(A, B) {
  //  Logger.log(A + "  " + B);
  var aRate = interestRate(A);
  var bRate = interestRate(B);
  if (!aRate || !bRate) {
    return 0;
  } else {
    return 4 - Math.abs(aRate - bRate);
  }
}


function interestTest() {
  var a = "I hate it";
  var b = "I love it";
  var c = "It's alright";
  Logger.log(interest(a, c));
}

// Returns 1 if the local buddy prefers an exchange buddy from
function countryPreference(localPreference, exchangeCountry) {
  return (localPreference == exchangeCountry) ? 1 : 0;
}

function preferenceTest() {
  var aPrefers = "Denmark";
  var bComesFrom = "Denmark";
  var cComesFrom = "Sweden";
  Logger.log(preference(aPrefers, cComesFrom));
}



function getPreferences(responses) {
  var prefs = [[]];
  return prefs;
}

