$(document).ready(function () {
    jsPlumb.ready(function () {
        console.log("Hello!");
        // setup some defaults for jsPlumb.
        var instance = jsPlumb.getInstance({
            Endpoint: ["Dot", {radius: 2}],
            Connector:"StateMachine",
            HoverPaintStyle: {stroke: "#1e8151", strokeWidth: 2 },
            ConnectionOverlays: [
                [ "Arrow", {
                    location: 1,
                    id: "arrow",
                    length: 14,
                    foldback: 0.8
                } ],
                [ "Label", { label: "Weight", id: "label", cssClass: "aLabel" }]
            ],
            Container: "canvas"
        });

        instance.registerConnectionType("basic", { anchor:"Continuous", connector:"StateMachine" });

        window.jsp = instance;

        var canvas = document.getElementById("canvas");
        var nodes = [];

        jQuery.get("/api/graphs/" + graphId).then(function (result) {
            nodes = result.nodes;
            console.log("Nodes:", nodes);

            // bind a click listener to each connection; the connection is deleted. you could of course
            // just do this: instance.bind("click", instance.deleteConnection), but I wanted to make it clear what was
            // happening.
            instance.bind("click", function (c) {
                instance.deleteConnection(c);
            });

            // bind a connection listener. note that the parameter passed to this function contains more than
            // just the new connection - see the documentation for a full list of what is included in 'info'.
            // this listener sets the connection's internal
            // id as the label overlay's text.
            // instance.bind("connection", function (info) {
            //     info.connection.getOverlay("label").setLabel(info.connection.id);
            // });

            instance.bind('connection', function(info, originalEvent) {
                // delete created connection and use my own function
                // for creating
                // if originalEvent is undefined - this connection was established programmaticaly
                console.log(info.sourceId, info.targetId);
                if (originalEvent) {
                    instance.deleteConnection(info.connection);
                    swal({
                        title: 'Select edge weight',
                        input: 'number',
                        inputPlaceholder: '1',
                        showCancelButton: true,
                        inputValidator: function (value) {
                            return new Promise(function (resolve, reject) {
                                if (parseInt(value) < 1) {
                                    reject('Weight should be greater than 0.')
                                } else {
                                    resolve()
                                }
                            })
                        }
                    }).then(function (result) {
                        let data = {from_node: info.sourceId, to_node: info.targetId, weight: result.value};
                        jQuery.post("/api/edges/", data, "json")
                            .then(function (edge) {
                                connectNodes(edge);
                            });
                    });
                    // connectNodes(info.sourceId, info.targetId, true);
                    console.log(info.sourceId, info.targetId);
                }
            });

            // bind a double click listener to "canvas"; add new node when this occurs.
            jsPlumb.on(canvas, "dblclick", function(e) {
                swal({
                    title: 'Select task weight',
                    input: 'number',
                    inputPlaceholder: '1',
                    showCancelButton: true,
                    inputValidator: function (value) {
                        return new Promise(function (resolve, reject) {
                            if (parseInt(value) < 1) {
                                reject('Weight should be greater than 0.')
                            } else {
                                resolve()
                            }
                        })
                    }
                }).then(function (result) {
                    jQuery.post("/api/nodes/", {left: e.offsetX, top: e.offsetY, weight: result.value, graph: graphId})
                        .then(function (result) {
                            newNode(result);
                        });
                });
            });

            //
            // initialise element as connection targets and source.
            //
            var initNode = function(el) {
                console.log("Gonna init node");
                // initialise draggable elements.
                // instance.draggable(el);

                instance.draggable(el, {
                    stop: function(e, ui) {
                        var offset = el.offset();
                        var parentOffset = $('#canvas').offset();
                        $.ajax({
                            url: '/api/nodes/' + el.attr("id") + "/",
                            type: 'PATCH',
                            data: {
                                'left': offset.left - parentOffset.left,
                                'top': offset.top - parentOffset.top
                            },
                            error: function() {
                                swal({
                                    title: 'Unexpected error',
                                    text: 'Sorry, something went wrong. Please, ty again later.',
                                    type: 'error',
                                    confirmButtonClass: 'btn-danger'
                                });
                            }
                        });
                    }
                });

                instance.makeSource(el, {
                    filter: ".ep",
                    anchor: "Continuous",
                    connectorStyle: { stroke: "#5c96bc", strokeWidth: 2, outlineStroke: "transparent", outlineWidth: 4 },
                    connectionType:"basic",
                    extract:{
                        "action":"the-action"
                    },
                    maxConnections: 30,
                    onMaxConnections: function (info, e) {
                        alert("Maximum connections (" + info.maxConnections + ") reached");
                    }
                });

                instance.makeTarget(el, {
                    dropOptions: { hoverClass: "dragHover" },
                    anchor: "Continuous",
                    allowLoopback: true
                });

                el.on("dblclick", function(e) {
                    e.stopPropagation();

                    swal({
                        title: 'Node deletion',
                        text: "Are you sure to delete this node?",
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Delete',
                        cancelButtonText: 'No, cancel!',
                        confirmButtonClass: 'btn btn-success',
                        cancelButtonClass: 'btn btn-danger',
                        buttonsStyling: false
                    }).then(
                        function () {
                            // unpublish the bot
                            $.ajax({
                                url: "/api/nodes/" + el.attr("id") + "/",
                                type: 'DELETE'
                            }).done(function(data, textStatus, xhr) {
                                if (xhr.status === 204) {
                                    let nodeId = el.attr("id");
                                    el.remove();

                                    let conns = instance.getConnections({'source': "t" + nodeId});

                                    for (let i = 0; i < conns.length; i++) {
                                        instance.deleteConnection(conns[i]);
                                    }
                                } else {
                                    swal("Failed to delete! " + xhr.status);
                                }

                            })
                        }, function (dismiss) {
                            // dismiss can be 'cancel', 'overlay',
                            // 'close', and 'timer'
                            // redirect from here
                            console.log('Dissmised node deletion.');
                        });
                });

                // this is not part of the core demo functionality; it is a means for the Toolkit edition's wrapped
                // version of this demo to find out about new nodes being added.
                //
                // instance.fire("jsPlumbDemoNodeAdded", el);
            };

            let newNode = function(result) {
                let $n = $(
                    '<div class="node" style="left: ' + result.left + 'px; top: ' + result.top +'px" id="' + result.id +'">' +
                    '<p class="text node-index">' + result.index +'</p>' +
                    '<hr class="split">' +
                    '<p class="text node-weight">' + result.weight +'[p]</p>' +
                    '<div class="ep" id="' + 't' + result.id +'"></div>' +
                    '</div>'
                );

                $(instance.getContainer()).append($n);
                initNode($n);
                return $n;
            };

            function connectNodes(edge) {
                let $source = $("#t" + edge.from_node);
                let $target = $("#" + edge.to_node);
                console.log($source, $target);
                let connector = instance.connect({
                    source: $source,
                    target: $target,
                    type:"basic",
                    // overlays:[
                    //     [ "Label", {label: edge.weight, id:"label"}]
                    // ]
                });

                let label = connector.getOverlay("label");
                console.log("Lable:", label);
                label.setLabel(edge.weight.toString());
                // // label.canvas.textContent = edge.weight;
                // label.label = edge.weight;
                // label.labelText = edge.weight;
                // console.log(connector);
            }

            // suspend drawing and initialise.
            instance.batch(function () {
                for (let i = 0; i < nodes.length; i++) {
                    newNode(nodes[i]);
                }

                for (let i = 0; i < nodes.length; i++) {
                    let edges = nodes[i].edges;
                    for (let j = 0; j < edges.length; j++) {
                        let edge = edges[j];
                        connectNodes(edge);
                    }
                }
                // and finally, make a few connections
                // instance.connect({ source: "opened", target: "phone1", type:"basic" });
                // instance.connect({ source: "phone1", target: "phone1", type:"basic" });
                // instance.connect({ source: "phone1", target: "inperson", type:"basic" });
                //
                // instance.connect({
                //     source:"phone2",
                //     target:"rejected",
                //     type:"basic"
                // });
            });

            // jsPlumb.fire("jsPlumbDemoLoaded", instance);

        });
        });
});
