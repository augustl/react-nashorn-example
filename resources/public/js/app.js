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
                        "Go to person " + this.props.person.name);
                }
            });

            var HomePageComponent = React.createClass({
                render: function () {
                    return React.DOM.div(
                        null,
                        React.DOM.h1(null, "The home page!"),
                        this.props.people.map(function (p) {
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
                        React.DOM.h1(null, "A person is a person. " + this.props.person.name),
                        React.DOM.a({onClick: this.gotoHome, href: this.getHomePath()}, "Back"));
                }
            });

            app.router = sillyRouter.create([
                {path: /^\/$/,
                 get: function (props) { return HomePageComponent(props); },
                 urls: function () { return {people: "/api/people"}; } },
                {path: /^\/people\/([^\/]+)$/,
                 get: function (props) { return PersonShowComponent(props); },
                 urls: function (match) { return {person: "/api/people/" + match[1]}; }}
            ]);

            app.getNotFoundComponent = function () {
                return NotFoundComponent({});
            };

            return app;
        }
    };
}(this));
