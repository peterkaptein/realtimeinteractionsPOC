# realtimeinteractionsPOC
This Proof of Concept is a personal project and created to explore simple ways to
* Create two-way databinding in the front
* Make any change in the page visible on other machines, using event messages sent via websockets


The code contains three parts:
* lib/client: A small client side framework to render HTML and do 2-way databinding with data objects
* lib/server: A small server side framework using websockets to share events between different browser clients
* lib/shared: A set of shared classes, written for convenience and as exploration of certain concepts 

