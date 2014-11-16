Buddies = new Mongo.Collection("buddies");
Setup = new Mongo.Collection("setup");
QuestionKeys = new Mongo.Collection("questionKeys");
QuestionImportances = new Mongo.Collection("questionImportances");
Matchings = new Mongo.Collection("matchings");
DEFAULT_IMPORTANCE = 50;

function makeResponseTable (str) {
    var rows = str.split("\n");
    var header = rows[0].split("\t");
    var responses = _.tail(rows);
    var table = _.map(responses, function(s, i) {
        return s.split("\t");
        // return _.object(header, columns);
    });
    // header = _.map(header, function(h) {
    //     return {
    //         value: h
    //     };
    // });
    return {header: header, responses: table};
}

function uid () {
    // return Math.floor((1 + Math.random()) * 0x10000).toString(10).substring(1);
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    }).substring(0, 8);
}

// Borrowed from https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Longest_common_substring#JavaScript
// We use this function to intelligently guess the mapping from questions to keys.
function longestCommonSubstring(string1, string2){
    // init max value
    var longestCommonSubstring = 0;
    // init 2D array with 0
    var table = [],
    len1 = string1.length,
    len2 = string2.length,
    row, col;
    for(row = 0; row <= len1; row++){
        table[row] = [];
        for(col = 0; col <= len2; col++){
            table[row][col] = 0;
        }
    }
    // fill table
    var i, j;
    for(i = 0; i < len1; i++){
        for(j = 0; j < len2; j++){
            if(string1[i]==string2[j]){
                if(table[i][j] == 0){
                    table[i+1][j+1] = 1;
                } else {
                    table[i+1][j+1] = table[i][j] + 1;
                }
                if(table[i+1][j+1] > longestCommonSubstring){
                    longestCommonSubstring = table[i+1][j+1];
                }
            } else {
                table[i+1][j+1] = 0;
            }
        }
    }
    return longestCommonSubstring;
}

getId = function () {
    return window.location.search.substr(3);
}

function getQuestionImportances() {
    var qi = QuestionImportances.find({matchId: getId()}, {
        sort: {"timestamp": -1}
    }).fetch();
    var joined = _.object(_.map(qi, function(q) {
        return [q.question, {importance: q.importance, id: q._id}];
    }));
    return joined;
}

getAllResponses = function(type) {
    var responses = {
        local: getResponses("local"),
        international: getResponses("international")
    };
    return responses;
}
getResponses = function(type) {
    var s = Setup.findOne({matchId: getId(), type: type}, {
        sort: {"timestamp": -1}
    });
    return s;
}

getMappings = function(type) {
    var ms = QuestionKeys.find({matchId: getId(), type: type}, {
        sort: {"timestamp": -1},
    }).fetch();
    var joined = _.object(_.map(ms, function(m) {
        return [m.question, {key: m.key, id: m._id}];
    }));
    return joined;
}

Router.route("/", {
    name: 'home'
});

Router.route('/new', {
    controller: 'ApplicationController',
    action: 'create'
});

Router.route('/setup', {
    controller: 'SetupController',
    data: function() {
        return {title: "Setup 1 - Data"};
    },
    action: 'setup'
});

Router.route('/keys', {
    controller: 'SetupController',
    name: 'keys',
    data: function() {
        return {title: "Setup 2 - Keys"};
    },
    action: 'keys'
});

Router.route('/match', {
    controller: 'MatchingController',
    name: 'match',
    data: function() {
        return {title: "Setup 3 - Match"};
    },
    action: 'match'
});

ApplicationController = RouteController.extend({
    layoutTemplate: "ApplicationLayout",
    onBeforeAction: function () {
        this.next();
    },
    action: function() {
        console.log("Override me!!!");
    },
    create: function() {
        var matchId = uid();
        this.redirect("/setup?m=" + matchId);
    },
});

HomeController = ApplicationController.extend({
    action: function() {
        this.layout('ApplicationLayout', {
            data: function () { return { title: "Index" }; }
        });
        this.render("Home");
    }
});

updateQuestionImportances = function() {
    var qi = getQuestionImportances("local");
    Session.set("questionImportances", qi);
}

updateResponsesSession = function() {
    console.log("on run");
    console.log(getResponses("local"));
    var responses = getAllResponses();
    if (_.indexOf(_.values(responses), undefined) !== -1) {
        // TODO: We may want to link towards setup
        return;
    }
    var mappings = {
        local: getMappings("local"),
        international: getMappings("international")
    };
    if (_.indexOf(_.values(mappings), undefined) !== -1) {
        // TODO: We may want to link towards keys
        return;
    }
    responses.local.data.responses = makeObjFromMatrix(responses.local.data, mappings.local);
    responses.international.data.responses = makeObjFromMatrix(responses.international.data, mappings.international);
    responses.local.data.mappings = mappings.local;
    responses.international.data.mappings = mappings.international;
    Session.set("responses", responses);
}

SetupController = ApplicationController.extend({
    onRun: function() {
        this.next();
    },
    setup: function () {
        this.render("New");
    },
    keys: function () {
        this.render("Keys");
    },
    onAfterAction: function() {
        Session.set("matchingId", getId());
    }
});
MatchingController = SetupController.extend({
    data: function() {
        return {
            setupUrl: "/setup?m" + getId(),
            keysUrl: "/setup?m" + getId()
        };
    },
    match: function () {
        this.render("Match", {
            data: function() {
                return {
                    questions: getQuestions()
                };
            },
        });
    },
    onRerun: function() {
        this.next();
    },
    onBeforeAction: function() {
        updateResponsesSession();
        updateQuestionImportances();
        var responses = Session.get("responses");
        if (_.isUndefined(responses)) {
            this.render("GoToSetup");
        } else if (responses === "FIXME") {
            this.render("GoToKeys");
        } else {
            this.next();
        }
    }
});

function makeObjFromMatrix(matrix, mappings) {
    var header = matrix.header;
    var responses = matrix.responses;
    return _.map(responses, function(r, i) {
        var row = _.map(header, function(question, j) {
            var keyObj = mappings[question];
            var key = keyObj.key;
            if (!_.isString(key)) {
                // TODO: Do something, warn user
                key = "FIXME";
                console.log("WARNING!! KEY MISSING for question: " + question);
            }
            var value = responses[i][j];
            return [key, value];
        });
        return _.object(row);
    });
    // body...
}

if (Meteor.isClient) {
    Template.New.events({
        "click #new-international": function() {
            var international = $("textarea[name='international']")[0].value;
            international = makeResponseTable(international);
            var millis = new Date().getTime();
            Setup.insert({timestamp: millis, matchId: getId(), type: "international", data: international});
        },
        "click #new-local": function() {
            var local = $("textarea[name='local']")[0].value;
            local = makeResponseTable(local);
            var millis = new Date().getTime();
            Setup.insert({timestamp: millis, matchId: getId(), type: "local", data: local});
        },
    });
    Template.New.helpers({
        keysLink: function() {
            return "/keys?m=" + getId();
        }
    });
    Template.Keys.helpers({
        matchingLink: function() {
            return "/matching?m=" + getId();
        },
        localQuestions: function() {
            console.log("hello!!");
            return getQuestionsForKeys("local");
        },
        internationalQuestions: function() {
            return getQuestionsForKeys("international");
        },
        questions: function() {
            return "";
        }
    });

    function getQuestionsForKeys (type) {
        var header = getResponses(type);
        header = (header !== undefined) ? header.data.header : header;
        var mapping = getMappings(type);
        header = _.map(header, function(h) {
            // console.log(h);
            var hasMapping = _.isObject(mapping[h]);
            var id = hasMapping ? mapping[h].id : "";
            // console.log(id);
            var classList = hasMapping ? "glyphicon glyphicon-ok-sign" : "glyphicon glyphicon-info-sign";
            return {question: h, hasMapping: hasMapping, classList: classList, id: id};
        });
        console.log(mapping["Timestamp"]);
        console.log(header);
        var requiredKeys = getVariables();
        return {type: type, header: header, mapping: mapping, requiredKeys: requiredKeys[type]};
    }


    Template.selectKeys.helpers({
        getOptions: function(data) {
            data = data.hash;
            console.log(data);
            var opts = getOptions(data.question, data.mapping, data.requiredKeys);
            return opts;
        },
    });

    Template.Keys.events({
        "click .confirm-btn": function(e) {
            var question = e.target.getAttribute("data-question");
            var type = e.target.getAttribute("data-type");
            // TODO: select only sib
            var key = $("select[name='" + question + "']").val();
            console.log(question);
            console.log(type);
            console.log(key);
            var millis = new Date().getTime();
            QuestionKeys.insert({
                matchId: getId(),
                question: question,
                key: key,
                timestamp: millis,
                type: type
            });
        },
        "change select": function(e) {
            var question = e.target.getAttribute("name");
            var id = e.target.getAttribute("id");
            var key = e.target.value;
            var select = $(e.target);
            console.log(id);
            var type = (_.indexOf(e.target.classList, "local-key") === -1) ? "international" : "local";
            var millis = new Date().getTime();
            console.log(key);
            if (_.isEmpty(id)) {
                console.log("inserting");
                QuestionKeys.insert({
                    matchId: getId(),
                    question: question,
                    key: key,
                    timestamp: millis,
                    type: type
                });
            } else {
                console.log("updating id: " + id);
                QuestionKeys.update({
                    _id: id,
                }, { $set: {
                    key: key
                }});
            }
        }
    });

    function upsertQuestionKey (data) {
        // body...
    }


    function getOptions(question, mapping, keys) {
        var max = 0;
        var doIntelligentGuess = !(_.isObject(mapping) && _.isObject(mapping[question]));
        // console.log(question + " +++ " + doIntelligentGuess);
        var options = _.map(keys, function(key) {
            var isSelected = false;
            var lcs = 0;
            if (doIntelligentGuess) {
                lcs = longestCommonSubstring(question.replace(/\s+/, "").toLowerCase(), key.toLowerCase());
            } else {
                isSelected = (mapping[question].key === key);
                console.log(question + " ---- "  + mapping[question].key + " --- " + key + " __ " + isSelected);
            }
            max = Math.max(lcs, max);
            return {key: key, isSelected: isSelected, lcs: lcs};
        });
        if (doIntelligentGuess) {
            options = _.map(options, function(o) {
                o.isSelected = (o.lcs > 3 && o.lcs === max);
                return o;
            });
        }
        return options;
    }

    function getMatchings () {
        return Matchings.find({matchId: getId()}, {
            sort: {"timestamp": -1}
        });
    }

    function getAvailableResponses() {
        var matchings = getMatchings().fetch();
        var responses = Session.get("responses");
        var locals = responses.local.data.responses;
        var internationals = responses.international.data.responses;

        var localCounts = _.countBy(matchings, function(m) {
            return m.local.email;
        });
        var internationalCounts = _.countBy(matchings, function(m) {
            return m.international.email;
        });

        locals = _.map(locals, function(l) {
            l.maxCapacity = capacity(l.willingness);
            l.assignments = localCounts[l.email] || 0;
            l.capacity = l.maxCapacity - l.assignments;
            return l;
        });

        locals = _.filter(locals, function(l) {
            return l.capacity > 0;
        });

        internationals = _.map(internationals, function(i) {
            i.assignments = internationalCounts[i.email] || 0;
            return i;
        });

        internationals = _.filter(internationals, function(i) {
            return i.assignments === 0;
        });

        return {
            local: locals,
            international: internationals
        }
    }

    function countAssignments (mathings, response) {
        // body...
    }


    Template.Responses.helpers({
        local: function() {
            return getResponses("local");
        },
        international: function() {
            return getResponses("international");
        },
        matchingId: function() {
            return getId();
        },
    });

    Template.Match.helpers({
        local: function() {
            return Setup.findOne({matchId: getId(), type: "local"}, {
                sort: {"timestamp": -1}
            });
        },
        international: function() {
            return Setup.findOne({matchId: getId(), type: "international"}, {
                sort: {"timestamp": -1}
            });
        },
        matchings: function() {
            return getMatchings();
        },
        proposals: function() {
            var matchData = Session.get("matchData");
            if (_.isUndefined(matchData)) return;
            var flow = maxCostBipartiteMatching(matchData.affinities);
            var locals = matchData.responses.local;
            var internationals = matchData.responses.international;
            // TODO: Figure out why some ids are too large
            flow = _.filter(flow, function(f) {
                var local = f[0];
                var international = f[1];
                return (local < locals.length && international < internationals.length)
            });
            var questions = getQuestions();
            var header = _.flatten(_.map(questions, function(q) {
                return q.repr.header;
            }));
            var responses = _.map(flow, function(f) {
                var local = locals[f[0]];
                var international = internationals[f[1]];
                console.log(local);
                console.log(f[1]);
                console.log(international);
                console.log(f[0]);
                return _.flatten(_.map(questions, function(q) {
                    return q.repr.data(local, international);
                }));
            });
            console.log(header);
            console.log(responses);
            return {
                data: {
                    header: header,
                    responses: responses
                }
            };
        },
        affinityScores: function() {
            // TODO: Add transponse
            // TODO: Add sorting on columns
            var availableResponses = getAvailableResponses();
            var importances = getQuestionImportances();
            console.log(importances);
            var affinities = calculateAffinities(availableResponses.local, availableResponses.international, importances);
            var matchData = {
                responses: availableResponses,
                affinities: affinities
            };
            Session.set("matchData", matchData);
            var local = _.map(_.zip(availableResponses.local, affinities), function(z) {
                return {
                    name: z[0].firstName,
                    affinities: z[1]
                };
            })
            return {
                local: local,
                international: availableResponses.international
            };
        }
    });

    Template.AffinityTable.helpers({
        headers: function(obj) {
            return _.keys(obj);
        },
        questionKeys: function(obj) {
            console.log(_.values(obj));
            return _.map(_.values(obj), function(mapping) {
                return mapping.key;
            });
        },
        cell: function(data) {
            data = data.hash;
            console.log(data);
            // return data.response[data.mapping[data.key]];
        }
    });
    Template.QuestionImportance.helpers({
        getImportance: function(name) {
            var qi = Session.get("questionImportances")
            var importance = qi[name]
            // GIVE ME GET OR ELSE!!!!!!!!!!!!!!!!!
            return _.isUndefined(importance) ? {importance: DEFAULT_IMPORTANCE, id: null} : importance;
        }
    });

    Template.QuestionImportance.events({
        "change .importance-slider": function(e) {
            var importance = parseInt(e.target.value);
            var id = e.target.getAttribute("data-id");
            var question = e.target.getAttribute("id");
            if (_.isNull(id)) {
                QuestionImportances.insert({
                    timestamp: new Date().getTime(),
                    matchId: getId(),
                    question: question,
                    importance: importance
                });
            } else {
                QuestionImportances.update({_id: id}, {
                    $set: {
                        importance: importance
                    }
                });
            }
        }
    });

}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}
