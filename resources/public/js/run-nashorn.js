(function (GLOBAL) {
    "use strict";

    var app = MyApp.create();

    GLOBAL.__RENDER_PAGE = function (url) {
        var component = app.getComponent(url, null);
        if (component) {
            return React.renderComponentToString(component)
        }
    };

    GLOBAL.__RENDER_NOT_FOUND = function () {
        React.renderComponentToString(app.getNotFoundComponent())
    }
}(this));
