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

function getId () {
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
        "click #new-locals": function() {
            var locals = $("textarea[name='locals']")[0].value;
            locals = makeResponseTable(locals);
            var millis = new Date().getTime();
            Setup.insert({timestamp: millis, matchId: getId(), type: "locals", data: locals});
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
            console.log(getResponses("locals"));
            return getResponses("locals").data.header;
        },
        internationalQuestions: function() {
            return getResponses("internationals").data.header;
        },
        localOptions: function(question) {
            // TODO: cache selected keys
            // TODO: cache requiredKeys
            var mapping = getMappings("local");
            var requiredKeys = getVariables();
            return getOptions(question, mapping, requiredKeys.local);
        },
        internationalOptions: function(question) {
            var mapping = getMappings("international");
            var requiredKeys = getVariables();
            return getOptions(question, mapping, requiredKeys.international);
        },
        questions: function() {
            return "";
        }
    });
    Template.Keys.events({
        "submit form": function(e) {
            e.preventDefault();
            var type = e.target.getAttribute("id");
            console.log(type);
            var keyValues = $("." + type).map(function(i, s) {
                return [[s.getAttribute('name'), s.value]];
            }).get();
            console.log(keyValues);
            var millis = new Date().getTime();
            keyValues = _.object(keyValues);
            QuestionKeys.insert({
                timestamp: millis,
                matchId: getId(),
                type: (type === "local-key") ? "local" : "international",
                data: keyValues
            });
        }
    });


    function getOptions(question, mapping, keys) {
        var max = 0;
        var options = _.map(keys, function(key) {
            // TODO: use longest common substring if mapping does not exist
            var isSelected = false;
            var lcs = 0;
            if (_.isObject(mapping)) {
                isSelected = (mapping.data[question] === key);
            } else {
                lcs = longestCommonSubstring(question.replace(/\s+/, "").toLowerCase(), key.toLowerCase());
            }
            // console.log(question);
            // console.log(key);
            // console.log(lcs);
            max = Math.max(lcs, max);
            return {key: key, isSelected: isSelected, lcs: lcs};
        });
        if (!_.isObject(mapping)) {
            options = _.map(options, function(o) {
                o.isSelected = (o.lcs > 3 && o.lcs === max);
                return o;
            });
        }
        return options;
    }

    function getResponses (type) {
        var s = Setup.find({matchId: getId(), type: type}, {
            sort: {"timestamp": -1},
            limit: 1
        }).fetch()[0];
        return s;
    }

    function getMappings (type) {
        return QuestionKeys.find({matchId: getId(), type: type}, {
            sort: {"timestamp": -1},
            limit: 1
        }).fetch()[0];
    }

    Template.Responses.helpers({
        locals: function() {
            return Setup.find({matchId: getId(), type: "locals"}, {
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
