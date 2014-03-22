(function () {
    function getUrl(url) {
        var deferred = when.defer();
        var req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.send();
        req.onload = function () {
            if (req.status >= 200 && req.status < 300) {
                deferred.resolve(req);
            } else {
                deferred.reject(req);
            }
        };
        return deferred.promise;
    }

    var app = MyApp.create();
    var target = document.getElementById("app");

    function renderComponent(component) {
        React.renderComponent(component, target);
    }

    function renderNotFound(component) {
        renderComponent(app.getNotFoundComponent());
    }

    function fetchDataFromUrls(urls) {
        if (urls) {
            var promises = [];
            for (var prop in urls) {
                promises.push(when(getUrl(urls[prop]), function (req) {
                    return {body: JSON.parse(req.responseText), prop: prop}
                }));
            }
            return when(when.all(promises), function (res) {
                var props = {};
                res.forEach(function (x) { props[x.prop] = x.body; });
                return props;
            })
        } else {
            return when.resolve({});
        }
    }

    function renderPath(path) {
        var match = app.router.match(path);
        if (match) {
            fetchDataFromUrls(match.urls).then(function (props) {
                renderComponent(match.get(props))
            }, function () {
                // TODO: Only render not found if all requests were 404.
                renderNotFound();
            });
        } else {
            renderNotFound();
        }
    };

    app.onLocationChangeRequested = function (url) {
        renderPath(url);
        history.pushState(null, null, url);
    };

    function renderCurrentPath() { renderPath(location.pathname); };
    window.addEventListener("popstate", renderCurrentPath);
    renderCurrentPath();
}());
