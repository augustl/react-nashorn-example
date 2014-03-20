(defproject react-nashorn-example "0.1.0-SNAPSHOT"
  :description "Example of using React + Nashorn for single page web apps with server-side initial rendering."
  :license {:name "BSD 2 Clause"
            :url "http://opensource.org/licenses/BSD-2-Clause"}
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [ring "1.2.1"]
                 [ring/ring-jetty-adapter "1.2.1"]
                 [joda-time "2.3"]
                 [hiccup "1.0.5"]
                 [optimus "0.14.2"]
                 [org.clojure/tools.nrepl "0.2.2"]
                 [compojure "1.1.6"]
                 [cheshire "5.3.1"]]
  :aot [react-nashorn-example.js-api-fetcher]
  :aliases {"server" ["run" "-m" "react-nashorn-example.cli/run" "4567"]})
