(ns react-nashorn-example.web
  (:require [optimus.assets :as assets]
            [optimus.link :as link]
            [optimus.prime :as optimus]
            [optimus.optimizations :as optimizations]
            [optimus.strategies :as strategies]
            [hiccup.page :refer [html5]]
            [compojure.core :refer [GET]]
            cheshire.core
            ring.middleware.content-type
            ring.middleware.not-modified
            [react-nashorn-example.nashorn-utils :as nashorn-utils]))

(defn get-shared-assets
  []
  (assets/load-bundle "public" "app.js"
                      [#"/js/lib/react.*\.js"
                       "/js/app.js"]))

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

(def people-db
  [{:id 1 :name "Hickey"}
   {:id 2 :name "Dijkstra"}
   {:id 3 :name "Sussman"}
   {:id 4 :name "Steele"}
   {:id 5 :name "Armstrong"}])

(defn get-person
  [db id]
  (first (filter #(= (:id %) id) db)))

(def api-handler
  (compojure.core/routes
   (GET "/api/people" [] {:status 200 :body (cheshire.core/generate-string people-db) :headers {"Content-Type" "application/json"}})
   (GET "/api/people/:person-id" [person-id] (if-let [person (get-person people-db (Integer/parseInt person-id))]
                                               {:status 200 :body (cheshire.core/generate-string person) :headers {"Content-Type" "application/json"}}))
   (GET "/api/*" [person-id] {:status 404 :headers {"Content-Type" "application/json"} :body "{}"})))

(defn web-handler
  [nashorn req]
  (if-let [react-html (get-react-html (:uri req) nashorn)]
    {:status 200 :headers {"Content-Type" "text/html"} :body (layout-page req react-html)}
    {:status 404 :headers {"Content-Type" "text/html"} :body (layout-page req (get-react-not-found-page nashorn))}))

(defn create-app
  [config]
  (let [optimizer (if (= :dev (:env config))
                    optimizations/none
                    optimizations/all)
        nashorn (nashorn-utils/create-engine
                 (map #(or (:contents %) (clojure.java.io/reader (:resource %)))
                      (optimizer (get-backend-assets) {})))]
    (->
     (compojure.core/routes
      api-handler
      (-> (partial web-handler nashorn)
          (optimus/wrap
           get-frontend-assets
           optimizer
           (if (= :dev (:env config))
             strategies/serve-live-assets
             strategies/serve-frozen-assets))))
     (ring.middleware.content-type/wrap-content-type)
     (ring.middleware.not-modified/wrap-not-modified))))
