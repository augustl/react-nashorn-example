# react-nashorn-example

This is a single page web app, where the initial page is also served as plain HTML, without any extra work or code duplication required!

When you click links in the web site (and JS is enabled), the single page web app will do all the page loading with JS. But because the initial page (and all pages) is loaded from the backend, your app will be indexable by Google, and also really fast! You don't have to wait for the JS to load to see the content, since it's served statically from the backend.

## Installing JDK1.8

### Linux

Use your package manager!

Alternatively, if you don't want to replace your system java, do the following:

* curl -LO -b oraclelicense=a http://download.oracle.com/otn-pub/java/jdk/8-b132/jdk-8-linux-x64.tar.g
* Extract
* export PATH=/path/to/jdk1.8.0/bin:$PATH

### Mac OS X

Please contribute a pull request :)

### Windows

Please contribute a pull request :)

## Running

You need JDK1.8, see above. When you have it, run the app with `lein server`. Don't have leiningen? See https://github.com/technomancy/leiningen.

Then open http://localhost:4567 in a browser, and enjoy!

## TODO

* Use a real router, not a simple if/return/regexp based home made thingie.
* Actually get component state from API on server. We currently hardcode {id: personId}.

## Copyright

Copyright © 2014 August Lilleaas

