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
        var component = app.getComponent(url, null);

        if (component) {
            renderComponent(component);
            history.pushState(null, null, url);
        } else {
            renderNotFound();
        }
    };

    function renderCurrentPath() {
        var component = app.getComponent(location.pathname, null);
        if (component) {
            renderComponent(component);
        } else {
            renderNotFound();
        }
    };

    window.addEventListener("popstate", function(e) {
        renderCurrentPath();
    });

    renderCurrentPath();
}());
