// check if the bot is published
document.addEventListener("DOMContentLoaded", function(event) {
    var botUrl = botListUrl + '/' + botId;
    $.get(botUrl).then(function(response) {
        var data = JSON.parse(response),
            redirectUrl = '/projects';
        if (data.settings.is_published) {
            // ask if the user want's to unpublish
            // bot and continue
            showModalAndContinueOrRedirect();
        } else {
            loadTemplatesAndInit(data.fsm_nodes);
            console.log(data);
        }

        function showModalAndContinueOrRedirect() {
            swal({
                title: 'This bot is published',
                text: "Can't edit published bot's dialog tree",
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Unpublish and proceed',
                cancelButtonText: 'No, cancel!',
                confirmButtonClass: 'btn btn-success',
                cancelButtonClass: 'btn btn-danger',
                buttonsStyling: false
            }).then(
                function () {
                    // unpublish the bot
                    $.ajax({
                        url: botUrl,
                        type: 'PATCH',
                        data: JSON.stringify({ 'settings': { 'is_published': false }})
                    }).then(function() {
                        data.settings.is_published = false;
                        loadTemplatesAndInit(data.fsm_nodes);
                        // initConstructor(data.fsm_nodes);
                    }).fail(function() {
                        showErrorAndRedirect(redirectUrl);
                    });
                }, function (dismiss) {
                    // dismiss can be 'cancel', 'overlay',
                    // 'close', and 'timer'
                    // redirect from here
                    console.log('Dissmised bot unpublishing');
                    window.location.href = redirectUrl;
                });
        }
    });

    function loadTemplatesAndInit(nodes) {
        // load templates first
        all([
            loadTemplate('/static/text_node_form_row_template.html', 'formRowTmpl'),
            loadTemplate('/static/node_template.html', 'nodeTmpl'),
            loadTemplate('/static/node_link_template.html', 'nodeLinkTmpl'),
            loadTemplate('/static/lead_collection_form_template.html', 'leadCollectionFormTmpl'),
            loadTemplate('/static/questions_table.html', 'questionsTableTmpl'),
            loadTemplate('/static/input_form_template.html', 'inputFormTmpl')
        ]).then(function() {
            console.log('Templates loaded.');
            initConstructor(nodes, $.templates);
        });
    }
});

function showErrorAndRedirect(url) {
    swal({
        title: 'Unexpected error',
        text: 'Sorry, something went wrong. Please, ty again later.',
        type: 'error',
        confirmButtonClass: 'btn-danger'
    }).then(function() {
        window.location.href = url;
    });
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function initConstructor(data) {
    console.log('Initialising constructor.');
    jsPlumb.bind("ready", function() {
        console.log(data);
        var botUrl = botListUrl + '/' + botId;
        // setup
        var UserPath = function() {
            this.path = [];
            this.position = null;

            this.push = function(id) {
                if (this.position == null) {
                    // first item
                    this.path.push(id);
                    this.position = 0;
                } else {
                    if (this.getCurrentNode() !== id) {
                        if (this.position != this.path.length - 1) {
                            // slice the array first
                            if (this.path.position !== id)
                                this.path = this.path.slice(0, this.position + 1);
                        }
                        this.path.push(id);
                        this.position = this.path.length - 1;
                    }
                };
            };

            this.canGoForward = function() {
                console.log('Can go forward:', this.position < this.path.length - 1);
                return this.position < this.path.length - 1;
            };

            this.canGoBack = function() {
                console.log('Can go back:', this.position > 0);
                return this.position > 0;
            };

            this.getCurrentNode = function() {
                return this.path[this.position];
            };

            this.hideModal = function() {
                // close to trigger saving
                $modal.modal('hide');
            };

            this.goBack = function() {
                if (this.canGoBack()) {
                    this.position -= 1;
                    // this.hideModal();
                    openNodeModal(this.getCurrentNode(), true);
                }
            };

            this.goForward = function() {
                if (this.canGoForward()) {
                    this.position += 1;
                    // this.hideModal();
                    openNodeModal(this.getCurrentNode(), true);
                }
            };

            this.deleteNodeFromPath = function(id) {
                // check if such node is in path
                var deletedNodePositions = [];
                for (var i = 0; i < this.path.length; i++) {
                    if (this.path[i] == id) {
                        deletedNodePositions.push(i);
                    }
                }

                // now delete this nodes from path
                for (var i = 0; i < deletedNodePositions; i++) {
                    var index = deletedNodePositions[i];
                    this.path.splice(index, 1);
                    // maybe decrement position
                    if (this.position >= index) {
                        if(this.position) {
                            this.position -= 1;
                        } else {
                            this.position = null;
                        }
                    }
                }
            };
        }

        var $container = $('#constructor-canvas'),
            $miniview = $('#miniview'),
            $textNodeForm = $('#text-node-form'),
            $enterMessages = $('#enter-messages'),
            $linksContainer = $('#links-container'),
            $fieldsContainer = $('#fields-container .fields'),
            $leadCollectionFormContainer = $('#lead-collection-form'),
            $img = $('#node-image'),
            $modal = $('#settings-modal'),
            $modalTitle = $('#modal-title'),
            $imgContainer = $('#img-container'),
            $deleteImageButton = $('#delete-image-button'),
            $backButton = $('#back-button'),
            $forwardButton = $('#forward-button'),
            $backButtonContainer = $('#back-button-container'),
            $forwardButtonContainer = $('#forward-button-container'),
            $setupAiContainer = $('#setup-ai-container'),
            $setupAiButton = $('#setup-ai-button'),
            $aiModal = $('#ai-modal'),
            $questionsContainer = $('#questions-container'),
            $qnaSettingsForm = $('#qna-settings-form'),
            $uploadXLSXForm = $('#upload-xlsx-form'),
            sourceOptions = {
                isTarget: false,
                isSource: true,
                anchor: 'RightMiddle',
                connector: ["Flowchart", {"cornerRadius": 2}],
                // connectorStyle: {strokeStyle: "#12C123", lineWidth: 2, outlineColor: "transparent", outlineWidth: 4},
                // filter: '.ep',
                maxConnections: 2
            },
            targetOptions = {
                isTarget: true,
                isSource: false,
                filter: '.link',
                dropOptions: { hoverClass: "dragHover" },
                anchor: ["Continuous", {faces: ["top", "left"]}],
                allowLoopback: false
            },
            nodesDict = {},
            linker = {},
            files,
            selectedNode,
            userPath = new UserPath(),
            shouldSave = false;

        var plumb = jsPlumb.getInstance({
            Endpoint: ['Dot', {radius: 1}],
            HoverPaintStyle: {strokeStyle: '#1e8151', lineWidth: 2},
            Container: '#constructor-container'
        });

        // $('#constructor-container').draggable({scroll: true});

        var basicConnection = {
            connector: 'Flowchart',
            // connector: 'Flowchart',
            paintStyle: {strokeStyle: 'red', lineWidth: 7},
            // hoverPaintStyle: {strokeStyle: 'red', lineWidth: 7}
        };

        plumb.registerConnectionType('basic', basicConnection);

        plumb.bind('connection', function(info, originalEvent) {
            // delete created connection and use my own function
            // for creating
            // if originalEvent is undefined - this connection was established programmaticaly
            if (originalEvent) {
                plumb.detach(info.connection);
                connectNodes(info.sourceId, info.targetId, true);
            }
        });

        function attachDeleteField(){
            $('span.delete-field').click(function(){
                var fieldId = $(this).data('id'),
                    url = botListUrl + '/' + botId + '/nodes/' + selectedNode + '/delete_field/' + fieldId;

                $.ajax({
                    url: url,
                    type: 'DELETE'
                }).then(function() {
                    var node = nodesDict[selectedNode],
                        position;
                    // find field position
                    for (var i = 0; i < node['fields'].length; i++) {
                        if (node['fields'][i]['_id']['$oid'] == fieldId) {
                            position = i;
                            break;
                        }
                    }
                    node['fields'].splice(position, 1);
                    $('div#fields-container div.fields tr#'+fieldId).remove();
                    initAIModal();
                }).fail(function() {
                    swal({
                        title: 'Unexpected error',
                        text: 'Sorry, something went wrong. Please, ty again later.',
                        type: 'error',
                        confirmButtonClass: 'btn-danger'
                    });
                });
            });
        }

        // draw existing nodes
        if (data.length) {
            console.log('Drawing nodes.');
            data.map(addNode);
            data.map(function(node) {
                if (node.links)
                    node.links.map(function(link) {
                        if (link.linked) {
                            connectNodes(link._id.$oid, link.linked.$oid, false);
                        }
                    });
                else if (node.linked) {
                    connectNodes('link_' + node._id.$oid, node.linked.$oid, false);
                };

                if (node.is_root) {
                    selectedNode = node['_id']['$oid'];
                }
            });
            jsPlumb.repaintEverything();
            // openNodeModal(data[0]['_id']['$oid']);
        } else {
            $('#hint').show();
        }

        $('#close-constructor-button').click(function() {
            window.location.href = baseUrl + '/settings/' + botId + '/design';
        });

        $backButton.click(function() {
            userPath.goBack();
        });

        $forwardButton.click(function() {
            userPath.goForward();
        });

        $deleteImageButton.click(function() {
            $img.attr('src', '');
            $deleteImageButton.hide();
            $.ajax({
                url: botUrl + '/nodes/' + selectedNode,
                method: 'PATCH',
                data: JSON.stringify({'image': null})
            }).then(function() {
                nodesDict[selectedNode]['image'] = null;
            });
        });

        $('#save-as-template-button').click(function() {
            $('#template-settings-modal').modal('show');
        });

        $('#template-settings-form').submit(function(e) {
            e.preventDefault();
            var templateData = {
                'template_name': $('#template_name').val(),
                'template_description': $('#template_description').val()
            };

            var isGlobalTemplateCheckbox = $('#is-global');
            if (isGlobalTemplateCheckbox)
                templateData['is_global'] = isGlobalTemplateCheckbox.prop('checked');
            else
                templateData['is_global'] = false;

            $.ajax({
                url: botUrl + '/bot_to_template',
                type: 'POST',
                data: JSON.stringify(templateData)
            }).then(function(resp) {
                var data = JSON.parse(resp);
                window.location.href = baseUrl + '/settings/' + data['_id']['$oid'] + '/design';
            }).fail(function() {
                swal(
                    'Oops...',
                    'Something went wrong! Try to reload page',
                    'error'
                )
            });
        });

        $('#publish-bot-button').click(function() {
            // check if there is a root node in bot
            var hasRootNode = false,
                nodesList = Object.values(nodesDict);
            for (var i = 0; i < nodesList.length; i++) {
                if (nodesList[i].is_root) {
                    hasRootNode = true;
                    break;
                }
            }

            if (hasRootNode) {
                // publish the bot and redirect
                $.ajax({
                    url: botUrl,
                    type: 'PATCH',
                    data: JSON.stringify({ 'settings': { 'is_published': true }})
                }).then(function() {
                    window.location.href = '/projects';
                }).fail(function() {
                    showErrorAndRedirect();
                });
            } else {
                swal({
                    title: "No starting block detected",
                    text: "Please, specify starting block before publishing.",
                    type: 'warning'
                });
            }

        });

        $('#test-bot-button').click(function() {
            $.ajax({
                url: botUrl + '/reload',
                type: 'PATCH'
            }).then(function() {
                $('#coloris-chat-container').remove();
                $('#coloris-chat-show-button').remove();
                initChat(window, document, true, selectedNode);
            });
        });

        function saveIfNeededAndTellIfCanCloseModal() {
            // collect all the data
            var canClose = true; // if we saved and can close modal
            var currentNode = nodesDict[selectedNode];
            if (currentNode) {
                var newData = $.extend(true, {}, currentNode),
                    dataToSend,
                    nodeType = currentNode['node_type'],
                    hasEmpty = false;
                console.log('Saving node ', currentNode);
                newData['enter_messages'] = $('#enter-messages').val().split('\n');
                delete newData['_id'];

                if (nodeType == 'text' || nodeType == 'users_request' || nodeType == 'qna' || nodeType == 'input_form') {
                    var currentLink = {};
                    newData['is_root'] = $('#is-root').prop('checked');
                    if (nodeType == 'text') {
                        newData['links'] = [];
                        currentNode['links'].forEach(function(link, index) {
                            currentLink = $.extend(true, {}, link);
                            currentLink['text'] = $('#link_' + currentLink['_id']['$oid']).val();
                            if (!currentLink['text']) {
                                hasEmpty = true;
                                // break;
                            } else {
                                newData['links'].push(currentLink);
                            }
                        });
                    }

                    if (!hasEmpty) {
                        dataToSend = $.extend(true, {}, newData);
                        // normalize ids before sending
                        if (nodeType == 'text') {
                            dataToSend['links'].forEach(function(link) {
                                link['_id'] = link['_id']['$oid'];
                                if (link['linked'])
                                    link['linked'] = link['linked']['$oid'];
                            });
                        } else if (nodeType == 'users_request' || nodeType == 'qna' || nodeType == 'input_form') {
                            if (dataToSend['linked'])
                                if (dataToSend['linked']['$oid'])
                                    dataToSend['linked'] = dataToSend['linked']['$oid'];
                                else
                                    dataToSend['linked'];
                        }

                        if (nodeType == 'input_form'){
                            // Update fields data
                            newData['fields'] = [];
                            $("#fields-container input").each(function(index){
                                var field_id = $(this).attr('name');
                                for (var i=0; i<dataToSend['fields'].length; i++){
                                    if (dataToSend['fields'][i]['_id']['$oid'] == field_id){
                                        dataToSend['fields'][i]['field_type'] = $('#fields-container select[name="'+field_id+'"]').val();
                                        dataToSend['fields'][i]['enter_message'] = $(this).val();
                                        newData['fields'].push(dataToSend['fields'][i]);
                                        break;
                                    }
                                }
                            });
                        }

                        // check if there is a new selected image
                        if (files) {
                            var formData = new FormData();
                            formData.append('image', files[0]);
                            formData.append('data', JSON.stringify(dataToSend));
                            dataToSend = formData;
                        } else {
                            // var questions = newData['questions'];
                            delete dataToSend['questions'];
                            dataToSend = JSON.stringify(dataToSend);
                            // if (newData['node_type'] == 'qna') {
                            //     newData['questions'] = questions;
                            // }
                        }
                    }

                } else if (currentNode['node_type'] == 'lead_collection') {
                    $.extend(newData, {
                        lead_collection_type: $('#lead_collection_type').val(),
                        ask_name_prompt: $('#ask_name_prompt').val(),
                        ask_contacts_prompt: $('#ask_contacts_prompt').val(),
                        thank_you_message: $('#thank_you_message').val()
                    });
                    for (k in data) {
                        if (data.hasOwnProperty(k))
                            if (!data[k]) {
                                hasEmpty = true;
                                // break;
                            }
                    }

                    if (newData['lead_collection_type'] == 'both') {
                        var contacts_type_prompt = $('#contacts_type_prompt').val();
                        if (!contacts_type_prompt)
                            hasEmpty = true;
                        else
                            newData['contacts_type_prompt'] = contacts_type_prompt;
                    }
                    dataToSend = JSON.stringify($.extend(true, {}, newData));
                }

                if (!hasEmpty) {
                    // send new data to the server
                    canClose = true;
                    console.log(dataToSend);
                    $.ajax({
                        url: botUrl + '/nodes/' + currentNode['_id']['$oid'],
                        type: 'PATCH',
                        data: dataToSend,
                        processData: false,
                        contentType: false,
                        error: function() {
                            swal({
                                title: 'Unexpected error',
                                text: 'Sorry, something went wrong. Please, ty again later.',
                                type: 'error',
                                confirmButtonClass: 'btn-danger'
                            });
                        }
                    }).done(function(data) {
                        // update noe data and redraw
                        console.log('Successfully updated. Redrawing.');
                        newData['_id'] = currentNode['_id'];

                        if (newData['is_root'])
                            Object.values(nodesDict).forEach(function(node) {
                                if (node['is_root'] && node != currentNode) {
                                    node['is_root'] = false;
                                }
                            });

                        // if image was sent
                        if (files) {
                            files = null;
                            newData['image'] = JSON.parse(data)['image'];
                        };

                        nodesDict[currentNode['_id']['$oid']] = newData;
                        // redraw
                        if (newData['enter_messages'])
                            $('#enter_messages_' + newData['_id']['$oid']).text(newData['enter_messages'][0]);

                        if (newData['links'])
                            newData['links'].forEach(function(link) {
                                console.log('Redrawing...');
                                $('#link_' + link['_id']['$oid'] + '_text').text(link['text']);
                            });

                        // reinitialise edit form
                    }).fail(function() {
                        swal({
                            title: 'Unexpected error',
                            text: 'Sorry, something went wrong. Please, ty again later.',
                            type: 'error',
                            confirmButtonClass: 'btn-danger'
                        });
                    });
                } else {
                    canClose = false;
                    swal({
                        title: "Empty fields are left",
                        text: "Please, fill in all fields.",
                        type: 'warning'
                    });
                }
                return canClose;
            } else {
                return true;
            }
        }

        $('#settings-modal').on('hide.bs.modal', function(e) {
            if (!saveIfNeededAndTellIfCanCloseModal()) {
                e.preventDefault();
            }
        });

        $('#text-node-form').change(function() {
            shouldSave = true;
        });

        $('#delete-node-button').click(function() {
            // remove links and node itself
            // firstly, check if this is not a root node
            // if (nodesDict[selectedNode].is_root) {
            //     swal({
            //         title: "Can't delete root block",
            //         text: "Make other block a root before deleting this one.",
            //         type: 'warning'
            //     });
            // } else {
            plumb.remove(selectedNode);
            // update data now
            delete nodesDict[selectedNode];
            Object.values(nodesDict).forEach(function(node) {
                if (node.links)
                    node.links.forEach(function(link) {
                        if (link.linked == selectedNode)
                            link.linked = null;
                    });
            });

            userPath.deleteNodeFromPath(selectedNode);

            $.ajax({
                url: botUrl + '/nodes/' + selectedNode,
                type: 'DELETE'
            }).then(function () {
                    // openNodeModal(Object.keys(nodesDict)[0]);
                    console.log('Node ' + selectedNode + ' was successfuly deleted.');
                    $modal.modal('hide');
                },
                function() {
                    swal(
                        'Oops...',
                        'Something went wrong! Try to reload page',
                        'error'
                    )
                });
        });

        $('#add-link-button').click(function(e) {
            e.preventDefault();
            // perform requet to server to get new links id
            if (nodesDict[selectedNode]['node_type'] == 'text') {
                var addLinkUrl = botUrl + '/nodes/' + selectedNode + '/add_link';
                $.post(addLinkUrl, function(resp) {
                    var newLink = JSON.parse(resp);
                    // add this new link to nodesDict
                    nodesDict[selectedNode].links.push(newLink);
                    $linksContainer.append($.templates.formRowTmpl.render(newLink));
                    // also add to rendered node card
                    var $newLink = $($.templates.nodeLinkTmpl.render(newLink));
                    $('#' + selectedNode + '_links_container').append($newLink);
                    $newLink = $('#' + newLink['_id']['$oid']);
                    $('#link_' + newLink['_id']['$oid']);
                    plumb.init_one_link = function() {
                        plumb.makeSource($newLink, sourceOptions);
                    }
                    plumb.batch(plumb.init_one_link);

                    $('.fa-window-close').click(removeLink);
                });
            }
        });

        $('#add-field-button').click(function(e) {
            e.preventDefault();
            // perform requet to server to get new fields id
            if (nodesDict[selectedNode]['node_type'] == 'input_form') {
                var addFieldUrl = botUrl + '/nodes/' + selectedNode + '/add_field';
                $.post(addFieldUrl, function(resp) {
                    var newField = JSON.parse(resp);
                    // add this new field to nodesDict and fields container
                    nodesDict[selectedNode].fields.push(newField);
                    $fieldsContainer.append($.templates.inputFormTmpl.render({'field': newField}));
                    attachDeleteField();
                });
            }
        });
        function createNode(e) {
            // create a new node
            swal({
                title: 'Select block type',
                input: 'select',
                inputOptions: {
                    'text': 'Text',
                    'lead_collection': 'Lead collection',
                    'users_request': 'Users request',
                    'qna': 'Questions & Answers',
                    'input_form': "Form"
                },
                inputPlaceholder: 'Select type',
                showCancelButton: true,
                inputValidator: function (value) {
                    return new Promise(function (resolve, reject) {
                        if (value === '') {
                            reject('You need to select type')
                        } else {
                            resolve()
                        }
                    })
                }
            }).then(function (result) {
                var newNode = {
                    'node_type': result,
                    'is_root': Object.keys(nodesDict).length == 0,
                    'position': {
                        'left': e.offsetX,
                        'top': e.offsetY
                    }
                };
                // posting new node to server
                $.post(botUrl + '/nodes', JSON.stringify(newNode), function(response) {
                    var newNode = JSON.parse(response);
                    $('#hint').hide();
                    addNode(newNode);
                    openNodeModal(newNode['_id']['$oid']);
                });
            });
        }

        // jsPlumb.on($('#constructor-container'), 'dblclick', createNode);
        $('#constructor-container').dblclick(createNode);

        plumb.bind('dblclick', function(conn, originalEvent) {
            originalEvent.stopPropagation();
            // tell server that connection was detached
            var nodes = Object.values(nodesDict),
                modifiedNode;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].links) {
                    nodes[i].links.forEach(function(link) {
                        if (link['_id']['$oid'] == conn.sourceId) {
                            modifiedNode = nodes[i];
                            link['linked'] = null;
                        }
                    });

                    if (modifiedNode)
                        break;
                } else if ('link_' + nodes[i]['_id']['$oid'] == conn.sourceId) {
                    // this is posible only for 'users_request'
                    // and 'lead_collection' nodes
                    // which dont have 'links' array,
                    // but have 'linked' property
                    modifiedNode = nodes[i];
                    modifiedNode['linked'] = null;
                }
            }

            var newData = Object.assign({}, modifiedNode);
            delete newData['_id'];
            delete newData['questions'];
            if (newData['links']) {
                newData['links'].forEach(function(link) {
                    link['_id'] = link['_id']['$oid'];
                    if (link['linked'])
                        link['linked'] = link['linked']['$oid'];
                });
            } else if (newData['linked']) {
                if (newData['linked'])
                    newData['linked'] = newData['linked']['$oid'];
            }

            $.ajax({
                url: botUrl + '/nodes/' + modifiedNode['_id']['$oid'],
                method: 'PATCH',
                data: JSON.stringify(newData)
            }).then(function() {
                plumb.detach(conn);
            }).fail(function () {
                swal(
                    'Oops...',
                    'Something went wrong! Try to reload page',
                    'error'
                );
            });
        });

        function markSelectedNode() {
            $('.node').removeClass('node-selected');
            $('#' + selectedNode).addClass('node-selected');
        }

        function connectNodes(source, target, save) {
            // check if the source isn't already used
            var conns = plumb.getConnections({'source': source});

            if (conns.length)
                plumb.detach(conns[0]);

            // find sourceNode, if it wasn't provided
            if (!linker.sourceNode) {
                Object.values(nodesDict).forEach(function(node, i, arr) {
                    if (node.links)
                        node.links.forEach(function(link) {
                            if (link['_id']['$oid'] == source)
                                linker.sourceNode = node['_id']['$oid'];
                        });
                    else if ('link_' + node['_id']['$oid'] == source) {
                        // this is posible only for 'users_request'
                        // and 'lead_collection' nodes
                        // which dont have 'links' array,
                        // but have 'linked' property
                        linker.sourceNode = node['_id']['$oid'];
                    }
                });
            }

            if (linker.sourceNode == target)
                return false;

            plumb.connect({
                source: source,
                target: target,
                connector: ["Flowchart", {"cornerRadius": 2}],
                // connectorStyle: {strokeStyle: "#12C123", lineWidth: 10, outlineColor: "transparent", outlineWidth: 4},
                paintStyle:{ stroke: getRandomColor(), strokeWidth:2 },
                hoverPaintStyle:{ stroke:"red", strokeWidth:5 },
                anchors: ['RightMiddle', 'Left']
            });
            if (save) {
                // find and update link data
                var sourceNode = nodesDict[linker.sourceNode],
                    nodeType = sourceNode['node_type'];
                if (nodeType == 'users_request' || nodeType == 'lead_collection' || nodeType == 'qna' || nodeType == 'input_form') {
                    $.ajax({
                        url: botUrl + '/nodes/' + linker.sourceNode,
                        type: 'PATCH',
                        data: JSON.stringify({'linked': target}),
                        error: function() {
                            swal({
                                title: 'Unexpected error',
                                text: 'Sorry, something went wrong. Please, ty again later.',
                                type: 'error',
                                confirmButtonClass: 'btn-danger'
                            });
                        }
                    });
                    sourceNode['linked'] = target;
                } else {
                    sourceNode.links.forEach(function(link, i, links) {
                        if (link['_id']['$oid'] == source) {
                            link.linked = {'$oid': target};
                            var linksData = [];
                            // copy links and normalize its ids
                            links.forEach(function(link) {
                                var copied = $.extend({}, link);
                                copied['_id'] = copied['_id']['$oid'];
                                if (copied['linked'])
                                    copied['linked'] = copied['linked']['$oid'];
                                linksData.push(copied);
                            });

                            // send data to server
                            $.ajax({
                                url: botUrl + '/nodes/' + linker.sourceNode,
                                type: 'PATCH',
                                data: JSON.stringify({'links': linksData}),
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
                }
            };
            linker.sourceNode = null;
            linker.source = null;
            linker.target = null;
        }

        function addNode(node) {
            var rendered = $.templates.nodeTmpl.render(node);
            var $newNode = $(rendered);
            nodesDict[node['_id']['$oid']] = node;

            $container.append($newNode);
            plumb.draggable($newNode, {
                stop: function(e, ui) {
                    var offset = $newNode.offset();
                    var parentOffset = $('#constructor-container').offset();
                    $.ajax({
                        url: botUrl + '/nodes/' + node['_id']['$oid'],
                        type: 'PATCH',
                        data: JSON.stringify({
                            'position': {
                                'left': offset.left - parentOffset.left,
                                'top': offset.top - parentOffset.top
                            }
                        }),
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

            plumb.init_endpoints = function() {
                plumb.makeTarget($newNode, targetOptions);
                plumb.makeSource($newNode.find('.ep'), sourceOptions);
            }
            plumb.batch(plumb.init_endpoints);

            var id = $newNode.attr('id');

            $newNode.click(function() {
                selectedNode = id;
                markSelectedNode();
                if (linker.source && linker.sourceNode != id) {
                    linker.target = id;
                    connectNodes(linker.source, linker.target, true);
                    // clear linker
                    // update data-next-id of next button
                    var selector = '#link_' + linker.source + '_buttons';
                    $(selector).children('.fa-arrow-circle-o-right').data('next-id', linker.target);
                    linker = {};
                }
            });

            $newNode.dblclick(function(e) {
                e.stopPropagation();
                openNodeModal(id, false, true);
            });
        };

        function initCheckbox(node) {
            $('.checkbox').show();

            if (node['is_root'])
                $('#is-root').prop('checked', true);
            else
                $('#is-root').prop('checked', false);

            $("#is-root").off('click');
        }

        function removeLink() {
            // remove this row from dom
            // detach connection
            // and tell the server about this

            var linkId = $(this).data('link-id');
            // this is the link of selected node, so
            var index,
                currentNode = nodesDict[selectedNode];

            for (var i = 0; i < currentNode.links.length; i++) {
                if (currentNode.links[i]['_id']['$oid'] == linkId) {
                    index = i;
                    break;
                }
            };

            currentNode.links.splice(index, 1);

            var conns = plumb.getConnections({'source': linkId});
            conns.map(plumb.detach);
            $('#link-' + linkId + '-row').remove();
            $('#' + linkId).remove();

            var updatedData = [];
            currentNode.links.forEach(function(link) {
                var newLink = $.extend({}, link);
                newLink['_id'] = newLink['_id']['$oid'];
                if (newLink['linked'])
                    newLink['linked'] = newLink['linked']['$oid'];
                updatedData.push(newLink);
            });

            // remove link from DOM
            $('#link_' + linkId + '_text').remove();

            $.ajax({
                url: botUrl + '/nodes/' + selectedNode,
                type: 'PATCH',
                data: JSON.stringify({'links': updatedData}),
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

        function showAIModalSpinner() {
            $('#ai-modal-body').addClass('sk-loading');
        }

        function hideAIModalSpinner() {
            $('#ai-modal-body').removeClass('sk-loading');
        }

        $uploadXLSXForm.submit(function(e) {
            e.preventDefault();
        }).validate({
            rules: {
                text: {
                    required: true,
                    accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            },
            messages: {
                text: 'XLSX file is required.'
            },
            submitHandler: function(form) {
                showAIModalSpinner();
                var data = new FormData(),
                    $fileInput = $('#xlsx-input'),
                    url = botUrl + '/nodes/' + selectedNode + '/upload_questions';

                data.append('xlsx', $fileInput.prop('files')[0]);

                $.ajax({
                    url: url,
                    type: 'POST',
                    data: data,
                    processData: false,
                    contentType: false
                }).then(function(data) {
                    var questions = JSON.parse(data);
                    nodesDict[selectedNode]['questions'] = questions;
                    initAIModal();
                }).fail(function(data, status, xhr) {
                    hideAIModalSpinner();
                    if (xhr.status == 400) {
                        swal({
                            title: 'Invalid file',
                            text: 'Uploaded file isn\'t formatted well.',
                            type: 'error',
                            confirmButtonClass: 'btn-danger'
                        });
                    } else {
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

        function initAIModal() {
            var node = nodesDict[selectedNode];
            $questionsContainer.html('');
            var $questionsTable = $.templates.questionsTableTmpl.render(node);
            $questionsContainer.html($questionsTable);
            initNewQuestionForm();
            initForms();
            initAITableButtons();
            hideAIModalSpinner();

            $('.delete-question').click(function() {
                var questionId = $(this).data('id'),
                    url = botListUrl + '/' + botId + '/nodes/' + selectedNode + '/questions/' + questionId;
                showAIModalSpinner();
                $.ajax({
                    url: url,
                    type: 'DELETE'
                }).then(function() {
                    var node = nodesDict[selectedNode],
                        position;

                    // find question position
                    for (var i = 0; i < node['questions'].length; i++) {
                        if (node['questions'][i]['_id']['$oid'] == questionId) {
                            position = i;
                            break;
                        }
                    }

                    node['questions'].splice(position, 1);
                    initAIModal();
                }).fail(function() {
                    hideAIModalSpinner();
                    swal({
                        title: 'Unexpected error',
                        text: 'Sorry, something went wrong. Please, ty again later.',
                        type: 'error',
                        confirmButtonClass: 'btn-danger'
                    });
                });
            });

            $('i.delete-answer').click(function() {
                var element = $(this),
                    questionId = element.data('question'),
                    answerId = element.data('id'),
                    position,
                    url = botListUrl + '/' + botId + '/nodes/' + selectedNode + '/questions/' + questionId + '/answers/' + answerId;
                showAIModalSpinner();
                $.ajax({
                    url: url,
                    type: 'DELETE'
                }).then(function() {
                    var node = nodesDict[selectedNode],
                        question;

                    // find question position
                    for (var i = 0; i < node['questions'].length; i++) {
                        if (node['questions'][i]['_id']['$oid'] == questionId) {
                            question = node['questions'][i];
                            break;
                        }
                    }

                    for (var i = 0; i < question['answers'].length; i++) {
                        if (question['answers'][i]['_id']['$oid'] == answerId) {
                            position = i;
                            break;
                        }
                    }

                    question['answers'].splice(position, 1);
                    initAIModal();
                }).fail(function() {
                    hideAIModalSpinner();
                    swal({
                        title: 'Unexpected error',
                        text: 'Sorry, something went wrong. Please, ty again later.',
                        type: 'error',
                        confirmButtonClass: 'btn-danger'
                    });
                });
            });
        }

        function initNewQuestionForm() {
            $('#new-question-form').submit(function(e) {
                e.preventDefault();
            }).validate({
                rules: {
                    text: { required: true }
                },
                messages: {
                    text: 'This field is required.'
                },
                submitHandler: function(form) {
                    var url = botListUrl + '/' + botId + '/nodes/' + selectedNode + '/questions';

                    var question = $('#new-question-container input').val();
                    showAIModalSpinner();
                    var successCallback = function(data, textStatus, xhr) {
                        // update state
                        if (xhr.status == 201) {
                            var node = nodesDict[selectedNode];
                            node.questions.push(JSON.parse(data));
                            console.log("Updated node with new question:", node);
                            // $('#new-question-container input').val('');
                            initAIModal();
                        } else if (xhr.status == 400) {
                            hideAIModalSpinner();
                            swal({
                                title: 'Unexpected error',
                                text: 'Sorry, something went wrong. Please, ty again later.',
                                type: 'error',
                                confirmButtonClass: 'btn-danger'
                            });
                        }
                    };

                    var errCallback = function(response) {
                        hideAIModalSpinner();
                        swal({
                            title: 'Unexpected error',
                            text: 'Sorry, something went wrong. Please, ty again later.',
                            type: 'error',
                            confirmButtonClass: 'btn-danger'
                        });
                    };

                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: JSON.stringify({ question: question }),
                        success: successCallback,
                        error: errCallback
                    });
                }
            });
        }

        function initForms() {
            initNewQuestionForm();
            $.each($('.new-answer-form-container form'), function (i, v) {
                $(v).submit(function(e) {
                    e.preventDefault();
                }).validate({
                    rules: {
                        text: { required: true }
                    },
                    messages: {
                        text: 'This field is required.'
                    },
                    submitHandler: function(form) {
                        var $form = $(form),
                            questionId = $form.data('question'),
                            url = botListUrl + '/' + botId + '/nodes/' + selectedNode + '/questions/' + questionId + '/answers',
                            text = $('#answer-for-' + questionId).val();

                        showAIModalSpinner();
                        var successCallback = function(data, textStatus, xhr) {
                            // update state
                            if (xhr.status == 201) {
                                var node = nodesDict[selectedNode],
                                    answer = JSON.parse(data);
                                node['questions'].forEach(function(q) {
                                    if (q['_id']['$oid'] == questionId) {
                                        q.answers.push(answer);
                                    }
                                });
                                // node.questions.push(JSON.parse(data));
                                // $($form.find('input')[0]).val('')

                                initAIModal();
                            } else if (xhr.status == 400) {
                                swal({
                                    title: 'Unexpected error',
                                    text: 'Sorry, something went wrong. Please, ty again later.',
                                    type: 'error',
                                    confirmButtonClass: 'btn-danger'
                                });
                            }
                        };

                        var errCallback = function(response) {
                            hideAIModalSpinner();
                            swal({
                                title: 'Unexpected error',
                                text: 'Sorry, something went wrong. Please, ty again later.',
                                type: 'error',
                                confirmButtonClass: 'btn-danger'
                            });
                        };

                        $.ajax({
                            url: url,
                            type: 'POST',
                            data: JSON.stringify({ text: text }),
                            success: successCallback,
                            error: errCallback
                        });
                    }
                });
            });

        }

        function initAITableButtons() {
            $('i.new-answer').click(function() {
                var question = $(this).data('question');
                var containerSelector = '#' + question + '-new-answer-form-container';
                $('.closeable').hide();
                $(containerSelector).show();
                $(containerSelector + ' input').focus();
            });

            var $addQuestionButton = $('#add-question');
            $addQuestionButton.click(function() {
                // create new question
                console.log('Add question clicked');
                $('.closeable').hide();
                // $newQuestionContainer.show(); - doesn't work somewhy
                $('#new-question-container').show();
                $('#new-question-container input').focus();
            });
        }

        function openAiModal() {
            $modal.modal('hide');
            $aiModal.modal('show');
            var node = nodesDict[selectedNode];
            $('#default-answer-input').val(node['default_answer']);
            $('#lang-input').val(node['lang']);
            $('#random-input').prop('checked', node['random']);
            $('#suggest-answer-input').val(node['suggest_answer']);
            initAIModal();
        };

        $aiModal.on('hide.bs.modal', function(e) {
            var newData = {},
                node = nodesDict[selectedNode],
                lang = $('#lang-input').val(),
                random = $('#random-input').prop('checked'),
                defaultAnswer = $('#default-answer-input').val(),
                suggestAnswer = $('#suggest-answer-input').val();

            if (lang != node['lang']) {
                newData['lang'] = lang;
            }

            if (random != node['random']) {
                newData['random'] = random;
            }

            if (defaultAnswer != node['default_answer']) {
                newData['default_answer'] = defaultAnswer;
            }

            if (suggestAnswer != node['suggest_answer']) {
                newData['suggest_answer'] = suggestAnswer;
            }

            if (!$.isEmptyObject(newData)) {
                $.ajax({
                    url: botUrl + '/nodes/' + selectedNode,
                    type: 'PATCH',
                    contentType: false,
                    processData: false,
                    data: JSON.stringify(newData)
                }).done(function() {
                    // update noe data and redraw
                    // debugger;
                    for (p in newData) {
                        if (newData.hasOwnProperty(p)) {
                            node[p] = newData[p];
                        }
                    }
                }).fail(function() {
                    swal({
                        title: 'Unexpected error',
                        text: 'Sorry, something went wrong. Please, ty again later.',
                        type: 'error',
                        confirmButtonClass: 'btn-danger'
                    });
                });
            }

            setTimeout(function() {$modal.modal('show')});
            console.log('AI modal closed');
        });

        function openNodeModal(nodeId, dontPushToUserPath, force) {
            if (force || saveIfNeededAndTellIfCanCloseModal()) {
                shouldSave = false;

                if (!dontPushToUserPath) {
                    userPath.push(nodeId);
                }

                // draw form for this node and remember it
                if (!userPath.canGoBack())
                    $backButtonContainer.hide();
                else
                    $backButtonContainer.show();

                if (!userPath.canGoForward())
                    $forwardButtonContainer.hide();
                else
                    $forwardButtonContainer.show();

                console.log('Selecting node ', nodeId);
                $('.modal-dialog').removeClass('modal-wide');
                $modal.modal();
                var node = nodesDict[nodeId];
                // if it has image, update img src, else clear it
                if (node['node_type'] == 'text') {
                    $setupAiContainer.hide();
                    $('#following-node').hide();
                    $modalTitle.text('Text block settings');
                    $('#add-link-button').show();
                    if (node['image']) {
                        $img.attr('src', node['image']);
                        $deleteImageButton.show();
                    } else {
                        $img.attr('src', '');
                        $deleteImageButton.hide();
                    }

                    $('#new-image').on('change', function(e) {
                        readURL(this);
                        files = e.target.files;
                        shouldSave = true;
                        $deleteImageButton.show();
                    });
                    $imgContainer.show();

                    initCheckbox(node);

                    $leadCollectionFormContainer.empty();
                    $leadCollectionFormContainer.hide();
                    // remove old links from form
                    $('.link').remove();

                    $tableRows = $.templates.formRowTmpl.render(node.links);
                    $linksContainer.append($tableRows);
                    $linksContainer.show();
                    $('#fields-container').hide();
                    // initialize link button click
                    $('.fa-link').click(function() {
                        $modal.modal('hide');
                        var fa = $(this);
                        linker.source = fa.data('link-id');
                        linker.sourceNode = nodeId;
                        console.log('Started linking for link ' + linker.source);
                    });
                    // initialize 'next' button click
                    $('.fa-arrow-circle-o-right').click(function() {
                        var element = $(this);
                        if (element.data('next-id')) {
                            // close to trigger saving
                            // $modal.modal('hide');
                            openNodeModal(element.data('next-id'));
                        }
                    });

                    // and remove button link
                    $('.fa-window-close').click(removeLink);
                } else if (node['node_type'] == 'qna') {
                    $setupAiContainer.show();
                    $('#add-link-button').hide();
                    $('.modal-dialog').removeClass('modal-wide');
                    $modalTitle.text('Q&A block');
                    initCheckbox(node);
                    $('#links-container').hide();
                    $leadCollectionFormContainer.empty();
                    $leadCollectionFormContainer.hide();
                    $('#fields-container').hide();
                    $('#following-node').click(openFollowingNode);

                    $setupAiButton.click(function(e) {
                        e.preventDefault();
                        openAiModal();
                    });
                }  else if (node['node_type'] == 'users_request') {
                    $('#following-node').show();
                    $setupAiContainer.hide();
                    $('#add-link-button').hide();
                    $('.modal-dialog').removeClass('modal-wide');
                    $modalTitle.text('Users request block');
                    initCheckbox(node);
                    $('#links-container').hide();
                    $leadCollectionFormContainer.empty();
                    $leadCollectionFormContainer.hide();
                    $fieldsContainer.hide();
                    $('#following-node').click(openFollowingNode);

                } else if (node['node_type'] == 'lead_collection') {
                    $('#following-node').show();
                    $('#add-link-button').hide();
                    $setupAiContainer.hide();
                    $('.modal-dialog').addClass('modal-wide');
                    $modalTitle.text('Information request block settings');
                    $imgContainer.hide();
                    $linksContainer.hide();
                    $('#fields-container').hide();
                    // $('.checkbox').hide();
                    $leadCollectionFormContainer.empty();
                    var $form = $.templates.leadCollectionFormTmpl.render(node);
                    $leadCollectionFormContainer.append($form);
                    $leadCollectionFormContainer.show();

                    if (node['lead_collection_type'] == 'both') {
                        $('#contacts_type_row').show();
                    } else {
                        $('#contacts_type_row').hide();
                    }

                    $('#lead_collection_type').on('change', function() {
                        if ($(this).val() == 'both')
                            $('#contacts_type_row').show();
                        else
                            $('#contacts_type_row').hide();
                    });

                    // initialize link button click
                    $('.fa-link').click(function() {
                        linker.source = 'link_' + nodeId;
                        linker.sourceNode = nodeId;
                        console.log('Started linking for link ' + linker.source);
                    });
                    // initialize 'next' button click
                    $('#following-node').click(openFollowingNode);
                }else if (node['node_type'] == 'input_form'){

                    $setupAiContainer.hide();
                    $('#following-node').show();
                    $modalTitle.text("Input form");
                    $('#add-link-button').hide();
                    $imgContainer.hide();
                    $linksContainer.show();
                    initCheckbox(node);

                    $('#links-container').hide();
                    $leadCollectionFormContainer.empty();
                    $leadCollectionFormContainer.hide();

                    // add fields
                    $fieldsContainer.empty();
                    for (var i = 0; i < node.fields.length; i++){
                        var $tableFields = $.templates.inputFormTmpl.render({'field':node.fields[i]});
                        $fieldsContainer.append($tableFields);
                    }
                    $('#fields-container').show();


                    attachDeleteField();

                    // initialize link button click
                    $('.fa-link').click(function() {
                        linker.source = 'link_' + nodeId;
                        linker.sourceNode = nodeId;
                        console.log('Started linking for link ' + linker.source);
                    });
                    // initialize 'next' button click
                    $('#following-node').click(openFollowingNode);
                }

                function openFollowingNode() {
                    var linked = nodesDict[nodeId]['linked']['$oid'];
                    if (linked) {
                        // close to trigger saving
                        // $modal.modal('hide');
                        openNodeModal(linked);
                    }
                }

                function readURL(input) {
                    if (input.files && input.files[0]) {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            $img.attr('src', e.target.result);
                        }
                        reader.readAsDataURL(input.files[0]);
                    }
                };

                $enterMessages.val(node.enter_messages.join('\n'));
                selectedNode = nodeId;
                markSelectedNode();
            }
        }
    });
}