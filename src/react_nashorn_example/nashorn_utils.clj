(ns react-nashorn-example.nashorn-utils
  (:import [javax.script
            ScriptEngineManager
            ScriptContext]))

(defn bindings-append
  [nashorn new-bindings]
  (let [bindings (.createBindings nashorn)]
    (doseq [[key value] new-bindings]
      (.put bindings key value))
    (.putAll bindings (.getBindings nashorn ScriptContext/ENGINE_SCOPE))
    bindings))

(defn create-engine
  [assets]
  (let [nashorn (.getEngineByName (ScriptEngineManager.) "nashorn")]
    ;; Browser module shims expects either 'window' or 'global' to be around.
    (.eval nashorn "var global = this")
    ;; Assets is a list of strings or readables, load them all into nashorn.
    (doseq [asset assets] (.eval nashorn asset))
    nashorn))
