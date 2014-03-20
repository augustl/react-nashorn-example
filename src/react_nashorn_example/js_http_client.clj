(ns react-nashorn-example.js-http-client
  (:require react-nashorn-example.web-api)
  (:import [java.util Map HashMap])
  (:gen-class
   :methods [^{:static true} [resolveUrls [java.util.Map] java.util.Map]]))

(defn fetch
  [urls]
  (pmap
   (fn [[prop url]]
     (if-let [res (react-nashorn-example.web-api/handler {:request-method :get :uri url})]
       (when (= (:status res) 200)
         [prop (:body res)])))
   urls))

(defn -resolveUrls
  [urls]
  (let [res (HashMap.)]
    (doseq [[prop data] (fetch urls)]
      (.put res prop data))
    res))
