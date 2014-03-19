(function (GLOBAL) {
    "use strict";

    GLOBAL.MyApp = {
        create: function () {
            var app = {};

            var NotFoundComponent = React.createClass({
                render: function () {
                    return React.DOM.h1(null, "Page not found. " + Math.random());
                }
            });

            var PersonLinkComponent = React.createClass({
                gotoPerson: function (e) {
                    e.preventDefault();
                    app.onLocationChangeRequested(this.getPath());
                },
                getPath: function () {
                    return "/people/" + this.props.person.id
                },
                render: function () {
                    return React.DOM.a(
                        {onClick: this.gotoPerson, href: this.getPath()},
                        "Go to person " + this.props.person.id);
                }
            });

            var HomePageComponent = React.createClass({
                render: function () {
                    var people = [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id :5}];
                    return React.DOM.div(
                        null,
                        React.DOM.h1(null, "The home page!"),
                        people.map(function (p) {
                            return React.DOM.p({key: p.id}, PersonLinkComponent({person: p}))
                        }));
                }
            });

            var PersonShowComponent = React.createClass({
                gotoHome: function (e) {
                    e.preventDefault();
                    app.onLocationChangeRequested(this.getHomePath())
                },
                getHomePath: function () {
                    return "/";
                },
                render: function () {
                    return React.DOM.div(
                        null,
                        React.DOM.h1(null, "A person is a person. " + this.props.person.id),
                        React.DOM.a({onClick: this.gotoHome, href: this.getHomePath()}, "Back"));
                }
            });

            app.matchRoute = function (url) {
                if (url === "/") {
                    return {
                        createComponent: function () {
                            return HomePageComponent({})
                        },
                        params: {}
                    }
                }

                var match = url.match(/^\/people\/([^\/]+)$/);
                if (match) {
                    var personId = match[1];
                    return {
                        createComponent: function () {
                            return PersonShowComponent({person: {id: personId}})
                        },
                        params: {personId: personId}
                    }
                }

                return {
                    createComponent: function () {
                        return app.getNotFoundComponent();
                    },
                    params: {}
                }
            };

            app.getNotFoundComponent = function () {
                return NotFoundComponent({});
            };

            return app;
        }
    };
}(this));
