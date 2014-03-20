(ns react-nashorn-example.web
  (:require [optimus.assets :as assets]
            [optimus.link :as link]
            [optimus.prime :as optimus]
            [optimus.optimizations :as optimizations]
            [optimus.strategies :as strategies]
            [hiccup.page :refer [html5]]
            ring.middleware.content-type
            ring.middleware.not-modified
            [react-nashorn-example.web-api :as web-api]
            [react-nashorn-example.nashorn-utils :as nashorn-utils]))

(defn get-shared-assets
  []
  (assets/load-bundle "public" "app.js"
                      [#"/js/lib/react.*\.js"
                       "/js/app.js"
                       "/js/silly-router.js"]))

(defn get-backend-assets
  []
  (concat
   (get-shared-assets)
   (assets/load-assets "public"
                       ["/js/run-nashorn.js"])))

(defn get-frontend-assets
  []
  (concat
   (get-shared-assets)
   (assets/load-bundle "public" "browser.js"
                       [#"/js/lib/when.*\.js"
                        "/js/run-browser.js"])))

(defn layout-page
  [req html]
  (html5
   [:head
    [:meta {:charset "utf-8"}]]
   [:body
    [:div#app html]
    (map (fn [url] [:script {:src url}])
         (link/bundle-paths req ["app.js" "browser.js"]))]))

(defn get-react-html
  [uri nashorn]
  (.eval nashorn "__RENDER_PAGE(url)" (nashorn-utils/bindings-append nashorn {"url" uri})))

(defn get-react-not-found-page
  [nashorn]
  (.eval nashorn "__RENDER_NOT_FOUND()"))

(defn web-handler
  [nashorn req]
  (if-let [react-html (get-react-html (:uri req) nashorn)]
    {:status 200 :headers {"Content-Type" "text/html"} :body (layout-page req react-html)}
    {:status 404 :headers {"Content-Type" "text/html"} :body (layout-page req (get-react-not-found-page nashorn))}))

(defn compose-ring-handlers
  "Returns the response of the first ring handler in the list that returns non-nil."
  [& handlers]
  (fn [req] (some #(% req) handlers)))

(defn create-app
  [config]
  (let [nashorn (nashorn-utils/create-engine
                 (map #(or (:contents %) (clojure.java.io/reader (:resource %)))
                      (get-backend-assets)))]
    (->
     (compose-ring-handlers
      web-api/handler
      (-> (partial web-handler nashorn)
          (optimus/wrap
           get-frontend-assets
           (if (= :dev (:env config))
             optimizations/none
             optimizations/all)
           (if (= :dev (:env config))
             strategies/serve-live-assets
             strategies/serve-frozen-assets))))
     (ring.middleware.content-type/wrap-content-type)
     (ring.middleware.not-modified/wrap-not-modified))))
