# react-nashorn-example

Blog post: http://augustl.com/blog/2014/jdk8_react_rendering_on_server/

This is a single page web app, where the initial page is also served as plain HTML, without any extra work or code duplication required!

When you click links in the web site (and JS is enabled), the single page web app will do all the page loading with JS. But because the initial page (and all pages) is loaded from the backend, your app will be indexable by Google, and also really fast! You don't have to wait for the JS to load to see the content, since it's served statically from the backend.

## Running

You need JDK1.8, see next section if you don't have it.

Run the app with:

    lein server

Then open [http://localhost:4567](http://localhost:4567) in a browser, and enjoy!

Leiningen is Clojure's build tool, if you don't have it, see [https://github.com/technomancy/leiningen](https://github.com/technomancy/leiningen)

## Installing JDK1.8

### Linux

Use your package manager!

Alternatively, if you don't want to replace your system java, do the following:

* `curl -LO -b oraclelicense=a http://download.oracle.com/otn-pub/java/jdk/8-b132/jdk-8-linux-x64.tar.gz`
* For 32bit, replace x64 in the end of the URL with i586
* Extract
* `export PATH=/path/to/jdk1.8.0/bin:$PATH`

### Mac OS X

Please contribute a pull request :)

### Windows

Please contribute a pull request :)

## Tradeoffs

Your React code has to use plain JS only, and not invoke any 3rd party components that requires a DOM. Facebook React supports rendering to a string without a DOM, which is what we actually do on the back-end. If a component invokes a jQuery plugin, you'll get an exception and the backend won't be able to render that page.

I'm not an experienced React user, so I'm not sure how this problem is typically solved. Pull requests are welcome.

## TODO

This is a POC. It would be nice with some kind of reusable library. That can probably happen when this todo-list becomes empty.

* Use a real router, not a simple if/return/regexp based home made thingie.
* Is it OK that the JS performs a request to the API for the data a second time, when the JS loads? Time has passed so you risk getting different data. Serializing the props used in the HTML is a possibility. Using Datomic is another, put the datomic T that was used by the backend in the HTML somewhere so the scripts can read and use it.

## Copyright

Copyright © 2014 August Lilleaas

