(ns react-nashorn-example.web
  (:require [optimus.assets :as assets]
            [optimus.link :as link]
            [optimus.prime :as optimus]
            [optimus.optimizations :as optimizations]
            [optimus.strategies :as strategies]
            [hiccup.page :refer [html5]]
            ring.middleware.content-type
            ring.middleware.not-modified)
  (:import [javax.script
            ScriptEngineManager
            ScriptContext]))

(defn get-shared-assets
  []
  (assets/load-bundle "public" "app.js"
                      [#"/js/lib/.*js"
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
                       ["/js/run-browser.js"])))

(defn layout-page
  [req html]
  (html5
   [:head
    [:meta {:charset "utf-8"}]]
   [:body
    [:div#app html]
    (map (fn [url] [:script {:src url}])
         (link/bundle-paths req ["app.js" "browser.js"]))]))

(defn nashorn-bindings-append
  [nashorn new-bindings]
  (let [bindings (.createBindings nashorn)]
    (doseq [[key value] new-bindings]
      (.put bindings key value))
    (.putAll bindings (.getBindings nashorn ScriptContext/ENGINE_SCOPE))
    bindings))

(defn get-react-html
  [uri nashorn]
  (.eval nashorn "__RENDER_PAGE(url)" (nashorn-bindings-append nashorn {"url" uri})))

(defn get-react-not-found-page
  [nashorn]
  (.eval nashorn "__RENDER_NOT_FOUND()"))

(defn create-app
  [config]
  (let [nashorn (.getEngineByName (ScriptEngineManager.) "nashorn")
        optimizer (if (= :dev (:env config))
                    optimizations/none
                    optimizations/all)]
    ;; TODO: Use this stuffs to get http stuffs?
    ; (.eval nashorn "var http = Java.type('react_nashorn_example.js_http_client')")
    ;;(println (.eval nashorn "http.wat(1)"))

    ;; React expects either 'window' or 'global' to be around.
    (.eval nashorn "var global = this")


    (doseq [asset (optimizer (get-backend-assets) {})]
      (.eval nashorn (or (:contents asset) (clojure.java.io/reader (:resource asset)))))
    (->
     (fn [req]
       (if-let [react-html (get-react-html (:uri req) nashorn)]
         {:status 200 :headers {"Content-Type" "text/html"} :body (layout-page req react-html)}
         {:status 404 :headers {"Content-Type" "text/html"} :body (layout-page req (get-react-not-found-page nashorn))}))
     (optimus/wrap
      get-frontend-assets
      optimizer
      (if (= :dev (:env config))
        strategies/serve-live-assets
        strategies/serve-frozen-assets))
     (ring.middleware.content-type/wrap-content-type)
     (ring.middleware.not-modified/wrap-not-modified))))
