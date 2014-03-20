(function () {
    var app = MyApp.create();
    var target = document.getElementById("app");

    function renderComponent(component) {
        React.renderComponent(component, target);
    }

    function renderNotFound(component) {
        renderComponent(app.getNotFoundComponent());
    }

    function getUrl(prop, url) {
        var deferred = when.defer();
        var req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.send();
        req.onload = function () {
            if (req.status >= 200 && req.status < 300) {
                deferred.resolve({prop: prop, url: url, body: req.responseText});
            } else {
                deferred.reject();
            }
        };

        return deferred.promise;
    }

    function resolveUrls(urls) {
        if (urls) {
            var promises = [];
            for (var prop in urls) {
                if (urls.hasOwnProperty(prop)) {
                    promises.push(getUrl(prop, urls[prop]));
                }
            }
            return when.all(promises);
        } else {
            var deferred = when.defer();
            deferred.resolve([]);
            return deferred.promise;
        }
    }

    function renderRouteMatch(match) {
        resolveUrls(match.urls).then(
            function (res) {
                var props = {};
                res.forEach(function (x) {
                    props[x.prop] = JSON.parse(x.body);
                });
                renderComponent(match.get(props))
            },
            function () {
                // TODO: Only render not found if all requests were 404.
                renderNotFound();
            }
        );
    };

    app.onLocationChangeRequested = function (url) {
        var match = app.router.match(url);

        if (match) {
            renderRouteMatch(match);
        } else {
            renderNotFound();
        }

        history.pushState(null, null, url);
    };

    function renderCurrentPath() {
        var match = app.router.match(location.pathname);

        if (match) {
            renderRouteMatch(match);
        } else {
            renderNotFound();
        }
    };

    window.addEventListener("popstate", function(e) {
        renderCurrentPath();
    });

    renderCurrentPath();
}());
