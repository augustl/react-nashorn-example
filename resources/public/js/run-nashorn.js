(function (GLOBAL) {
    "use strict";

    var app = MyApp.create();
    var apiFetcher = Java.type('react_nashorn_example.js_api_fetcher')

    function mapToHashMap(map) {
        var HashMap = Java.type("java.util.HashMap");
        var result = new HashMap();
        for (var prop in map) {
            if (map.hasOwnProperty(prop)) {
                result.put(prop, map[prop]);
            }
        }
        return result;
    }
    function getProps(urls) {
        if (urls) {
            var res = apiFetcher.resolveUrls(mapToHashMap(urls));
            var parsedRes = {};
            for (var prop in res) {
                parsedRes[prop] = JSON.parse(res[prop])
            }

            return parsedRes;
        }
    }

    GLOBAL.__RENDER_PAGE = function (url) {
        var match = app.router.match(url);
        if (match) {
            return React.renderComponentToString(match.get(getProps(match.urls)))
        }
    };

    GLOBAL.__RENDER_NOT_FOUND = function () {
        React.renderComponentToString(app.getNotFoundComponent())
    }
}(this));
