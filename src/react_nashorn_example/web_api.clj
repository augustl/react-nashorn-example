(ns react-nashorn-example.web-api
  (:require cheshire.core
            [compojure.core :refer [GET]]))

(def people-db
  [{:id 1 :name "Hickey"}
   {:id 2 :name "Dijkstra"}
   {:id 3 :name "Sussman"}
   {:id 4 :name "Steele"}
   {:id 5 :name "Armstrong"}])

(defn get-person
  [db id]
  (first (filter #(= (:id %) id) db)))

(def handler
  (compojure.core/routes
   (GET "/api/people" [] {:status 200 :body (cheshire.core/generate-string people-db) :headers {"Content-Type" "application/json"}})
   (GET "/api/people/:person-id" [person-id] (if-let [person (get-person people-db (Integer/parseInt person-id))]
                                               {:status 200 :body (cheshire.core/generate-string person) :headers {"Content-Type" "application/json"}}))
   (GET "/api/*" [person-id] {:status 404 :headers {"Content-Type" "application/json"} :body "{}"})))
