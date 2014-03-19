(function () {
    var app = MyApp.create();
    var target = document.getElementById("app");

    function renderComponent(component) {
        React.renderComponent(component, target);
    }

    function renderNotFound(component) {
        renderComponent(app.getNotFoundComponent());
    }

    app.onLocationChangeRequested = function (url) {
        var route = app.matchRoute(url);

        if (route) {
            renderComponent(route.createComponent());
            history.pushState(null, null, url);
        } else {
            renderNotFound();
        }
    };

    function renderCurrentPath() {
        var route = app.matchRoute(location.pathname);
        if (route) {
            renderComponent(route.createComponent());
        } else {
            renderNotFound();
        }
    };

    window.addEventListener("popstate", function(e) {
        renderCurrentPath();
    });

    renderCurrentPath();
}());
