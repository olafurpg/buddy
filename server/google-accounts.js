if (ServiceConfiguration.configurations.find({service: 'google'}).count()===0) {
    ServiceConfiguration.configurations.insert({
        service: "google",
        appId: "757859387382-vb4q7m2v5crqjg2tm1gvd1t5pj9ovo1c.apps.googleusercontent.com",
        secret: "nttdD64voC43AQqvubSvncbA"
    });
}

