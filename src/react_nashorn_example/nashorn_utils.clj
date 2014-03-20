(ns react-nashorn-example.nashorn-utils
  (:import [javax.script
            ScriptEngineManager
            ScriptContext]))

(defn bindings-append
  "'inherits' bindings, allowing you to eval a script with extra global variables set, and
    also inheriting all the existing global variables.

    (.eval nashorn \"var hmm = 2;\")
    (.eval nashorn \"hmm + 2\" (.createBindings nashorn)) ;; An error, 'hmm' is not defined.
    (.eval nashorn \"hmm + wat\" (bindings-append nashorn {\"wat\" 3})) ;; 5"
  [nashorn new-bindings]
  (let [bindings (.createBindings nashorn)]
    ;; Add our own bindings
    (doseq [[key value] new-bindings]
      (.put bindings key value))
    ;; Inherit global bindings
    (.putAll bindings (.getBindings nashorn ScriptContext/ENGINE_SCOPE))
    bindings))

(defn create-engine
  "Creates a new nashorn script engine and loads a bunch of scripts into it."
  [scripts]
  (let [nashorn (.getEngineByName (ScriptEngineManager.) "nashorn")]
    ;; Browser module shims expects either 'window' or 'global' to be around.
    (.eval nashorn "var global = this")
    ;; 'scripts' is a list of strings or readables, load them all into nashorn.
    (doseq [script scripts] (.eval nashorn script))
    nashorn))
