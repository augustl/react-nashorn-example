# react-nashorn-example

First, aquire JDK1.8. On linux, you can do the following:

* curl -LO -b oraclelicense=a http://download.oracle.com/otn-pub/java/jdk/8-b132/jdk-8-linux-x64.tar.g
* Extract
* export PATH=/path/to/jdk1.8.0/bin:$PATH

If you're on OS X, I'm not sure what you need to do. You probably need to download an installer and replace your system Java. Please contribute a pull request if you have a solution fo OS X :)

Start the web server with:

* lein server

Then open http://localhost:4567 in a browser, and enjoy!

## TODO

* Use a real router, not a simple if/return/regexp based home made thingie.
* Actually get component state from API on server. We currently hardcode {id: personId}.

## Copyright

Copyright © 2014 August Lilleaas

