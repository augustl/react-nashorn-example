(function (GLOBAL) {
    "use strict";

    /**
     * A very small home made regexp based router. See app.js for an example. The router
     * there is invoked with `app.router.match('/people/1')` and returns the React component
     * for that page.
     */
    var sillyRouter = {
        create: function (routes) {
            return {
                match: function (pathStr) {
                    for (var i = 0, ii = routes.length; i < ii; i++) {
                        var route = routes[i];
                        var match = pathStr.match(route.path);
                        if (match) {
                            return {
                                get: route.get,
                                urls: route.urls(match)
                            }
                        }
                    }
                }
            }
        }
    };

    GLOBAL.sillyRouter = sillyRouter;
}(this));
