(ns react-nashorn-example.cli
  (:require react-nashorn-example.web
            [ring.adapter.jetty :as jetty]
            [optimus.prime :as optimus]
            [optimus.optimizations :as optimizations]
            [optimus.strategies :refer [serve-live-assets]]
            optimus.export
            clojure.tools.nrepl.server))

(defn run
  [port]
  (let [repl (clojure.tools.nrepl.server/start-server :port 0 :bind "127.0.0.1")]
    (println "nrepl started at" (:port repl)))
  (jetty/run-jetty
   (react-nashorn-example.web/create-app {:env :dev})
   {:port (Integer/parseInt port)
    :join? true}))
