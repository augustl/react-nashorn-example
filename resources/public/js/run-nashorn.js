(function (GLOBAL) {
    "use strict";

    var app = MyApp.create();

    GLOBAL.__RENDER_PAGE = function (url) {
        var route = app.matchRoute(url);
        if (route) {
            return React.renderComponentToString(route.createComponent())
        }
    };

    GLOBAL.__RENDER_NOT_FOUND = function () {
        React.renderComponentToString(app.getNotFoundComponent())
    }
}(this));
