(function (GLOBAL) {
    "use strict";

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
