(function (GLOBAL) {
    "use strict";

    var app = MyApp.create();
    var http = Java.type('react_nashorn_example.js_http_client')

    function urlsToHashMap(urls) {
        var HashMap = Java.type("java.util.HashMap");
        var result = new HashMap();
        for (var prop in urls) {
            if (urls.hasOwnProperty(prop)) {
                result.put(prop, urls[prop]);
            }
        }
        return result;
    }
    function getProps(route) {
        if (route.urls) {
            var res = http.resolveUrls(urlsToHashMap(route.urls));
            var parsedRes = {};
            for (var prop in res) {
                parsedRes[prop] = JSON.parse(res[prop])
            }

            return parsedRes;
        }
    }

    GLOBAL.__RENDER_PAGE = function (url, urlsGetter) {
        var route = app.matchRoute(url);
        if (route) {
            return React.renderComponentToString(route.createComponent(getProps(route)))
        }
    };

    GLOBAL.__RENDER_NOT_FOUND = function () {
        React.renderComponentToString(app.getNotFoundComponent())
    }
}(this));
