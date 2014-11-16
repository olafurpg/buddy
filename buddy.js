Buddies = new Mongo.Collection("buddies");
Setup = new Mongo.Collection("setup");
QuestionKeys = new Mongo.Collection("questionKeys");

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

Router.route("/", {
    name: 'home'
});

Router.route('/new', {
    controller: 'ApplicationController',
    action: 'create'
});

Router.route('/setup', {
    controller: 'MatchingController',
    data: function() {
        return {title: "Setup 1 - Data"};
    },
    action: 'setup'
});

Router.route('/keys', {
    controller: 'MatchingController',
    name: 'keys',
    data: function() {
        return {title: "Setup 2 - Keys"};
    },
    action: 'keys'
});

Router.route('/overview', {
    controller: 'MatchingController',
    name: 'match',
    data: function() {
        return {title: "Overview"};
    },
    action: 'overview'
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

MatchingController = ApplicationController.extend({
    onRun: function() {
        this.next();
    },
    setup: function () {
        this.render("New");
    },
    overview: function () {
        this.render("Responses");
    },
    keys: function () {
        this.render("Keys");
    },
    onAfterAction: function() {
        Session.set("matchingId", getId());
    }
});

if (Meteor.isClient) {
    Template.New.events({
        "click #new-internationals": function() {
            var internationals = $("textarea[name='internationals']")[0].value;
            internationals = makeResponseTable(internationals);
            var millis = new Date().getTime();
            Setup.insert({timestamp: millis, matchId: getId(), type: "internationals", data: internationals});
        },
        "click #new-local": function() {
            var local = $("textarea[name='local']")[0].value;
            local = makeResponseTable(local);
            var millis = new Date().getTime();
            Setup.insert({timestamp: millis, matchId: getId(), type: "local", data: local});
            // window.location = "/overview?m=" + getId();
        },
        "click #continue": function() {
            window.location = "/overview?m=" + getId();
        }
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
            var header = getResponses("local");
            header = (header !== undefined) ? header.data.header : header;
            var mapping = getMappings("local");
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
            return {type: "local", header: header, mapping: mapping, requiredKeys: requiredKeys.local};
        },
        // internationalQuestions: function() {
        //     var header = getResponses("internationals");
        //     header = (header !== undefined) ? header.data.header : header;
        //     var mapping = getMappings("international");
        //     return {header: header, mapping: mapping};
        // },
        // localOptions: function(data) {
        //     data = data.hash;
        //     console.log(data);
        //     // TODO: cache selected keys
        //     // TODO: cache requiredKeys
        //     return getOptions(data.question, data.mapping, requiredKeys.local);
        // },
        // internationalOptions: function(data) {
        //     data = data.hash;
        //     var requiredKeys = getVariables();
        //     var opts = getOptions(data.question, data.mapping, requiredKeys.international);
        //     return opts;
        // },
        questions: function() {
            return "";
        }
    });


    Template.selectKeys.helpers({
        getOptions: function(data) {
            data = data.hash;
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

    function getResponses(type) {
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

    Template.Responses.helpers({
        local: function() {
            return Setup.find({matchId: getId(), type: "local"}, {
                sort: {"timestamp": -1},
                limit: 1
            });
        },
        internationals: function() {
            return Setup.find({matchId: getId(), type: "internationals"}, {
                sort: {"timestamp": -1},
                limit: 1
            });
        },
        matchingId: function() {
            return getId();
        },
    });

    Template.ResponseTable.helpers({
    });

}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
}
