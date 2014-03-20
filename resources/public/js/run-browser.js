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

    function renderRoute(route) {
        resolveUrls(route.urls).then(
            function (res) {
                var props = {};
                res.forEach(function (x) {
                    props[x.prop] = JSON.parse(x.body);
                });
                renderComponent(route.createComponent(props))
            },
            function () {
                // TODO: Only render not found if all requests were 404.
                renderNotFound();
            }
        );
    };

    app.onLocationChangeRequested = function (url) {
        var route = app.matchRoute(url);

        if (route) {
            renderRoute(route);
            history.pushState(null, null, url);
        } else {
            renderNotFound();
        }
    };

    function renderCurrentPath() {
        var route = app.matchRoute(location.pathname);
        if (route) {
            renderRoute(route);
        } else {
            renderNotFound();
        }
    };

    window.addEventListener("popstate", function(e) {
        renderCurrentPath();
    });

    renderCurrentPath();
}());
