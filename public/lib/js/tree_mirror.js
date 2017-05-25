// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function TreeMirror(root, delegate) {
  this.root = root;
  this.idMap = {};
  this.delegate = delegate;
}

TreeMirror.prototype = {
  initialize: function(rootId, children) {

    this.idMap = {};


    this.idMap[rootId] = this.root;

    for (var i = 0; i < children.length; i++)
      this.deserializeNode(children[i], this.root);
  },

  deserializeNode: function(nodeData, parent) {
    if (nodeData === null)
      return null;

    if (typeof nodeData == 'number'){
      return this.idMap[nodeData];
    }

    var doc = this.root instanceof HTMLDocument ? this.root : this.root.ownerDocument;

    var node;

    switch(nodeData.nodeType) {
      case Node.COMMENT_NODE:
        node = doc.createComment(nodeData.textContent);
        break;

      case Node.TEXT_NODE:
        node = doc.createTextNode(nodeData.textContent);
        break;

      case Node.DOCUMENT_TYPE_NODE:
        node = doc.implementation.createDocumentType(nodeData.name, nodeData.publicId, nodeData.systemId);
        break;

      case Node.ELEMENT_NODE:
        if (this.delegate && this.delegate.createElement)
          node = this.delegate.createElement(nodeData.tagName);
        if (!node)
          node = doc.createElement(nodeData.tagName);

        Object.keys(nodeData.attributes).forEach(function(name) {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, name, nodeData.attributes[name])) {
                try{
                  //if(paren)
                   if(!node.hasAttribute(name))
                      node.setAttribute(name, nodeData.attributes[name]);
                }catch(err){
                  //console.log(err);
                }
            
          }
        }, this);

        break;
    }

    if(this.delegate.Postfilter)
      node = this.delegate.Postfilter(node);

    this.idMap[nodeData.id] = node;

    if (parent){
        try{
          //if(paren)
          parent.appendChild(node);
        }catch(err){
           //console.log(err);
           //console.log(node);
        }
     }

    if (nodeData.childNodes) {
      for (var i = 0; i < nodeData.childNodes.length; i++)
        this.deserializeNode(nodeData.childNodes[i], node);
    }

    return node;
  },

  applyChanged: function(removed, addedOrMoved, attributes, text) {
    
    function removeNode(node) {
      if(node == undefined ) return;
      if (node.parentNode)
        node.parentNode.removeChild(node);
    }

    function moveOrInsertNode(data) {
      var parent = data.parentNode;
      var previous = data.previousSibling;
      var node = data.node;
      try{
                  //if(paren)
            parent.insertBefore(node, previous ? previous.nextSibling : parent.firstChild);
      }catch(err){
            //console.log(err);
                  //console.log(node);
      }
      
    }

    function updateAttributes(data) {
      if(data == undefined) return;
      //console.log('Before');
      //console.log(data);
      var node = this.deserializeNode(data.node);

      Object.keys(data.attributes).forEach(function(attrName) {
        var newVal = data.attributes[attrName];
        if (newVal === null) {
          node.removeAttribute(attrName);
        } else {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, attrName, newVal)) {
                if(node != undefined ){
                  if(attrName == 'selected'){
                      $(node).siblings().removeAttr('selected');
                      node.setAttribute(attrName, newVal);
                      //$(node)
                      $(node.parentNode).attr('value',$(node).attr('value'));
                  }
                  else{
                    $(node).attr(attrName, newVal);
                    $(node).trigger('change');
                  }
                  
                }
          }
        }
      }, this);

    }

    function updateText(data) {
      var node = this.deserializeNode(data.node);
      node.textContent = data.textContent;
    }

    addedOrMoved.forEach(function(data) {
      data.node = this.deserializeNode(data.node);
      data.previousSibling = this.deserializeNode(data.previousSibling);
      data.parentNode = this.deserializeNode(data.parentNode);

      // NOTE: Applying the changes can result in an attempting to add a child
      // to a parent which is presently an ancestor of the parent. This can occur
      // based on random ordering of moves. The way we handle this is to first
      // remove all changed nodes from their parents, then apply.
      removeNode(data.node);
    }, this);

    removed.map(this.deserializeNode, this).forEach(removeNode);
    addedOrMoved.forEach(moveOrInsertNode);
    
    attributes.forEach(updateAttributes, this);
    text.forEach(updateText, this);

    removed.forEach(function(id) {
      delete this.idMap[id]
    }, this);

  }
}


function TreeMirrorClient(target, mirror, testingQueries) {
  this.target = target;
  //console.log('TreeMirrorClient');
  //console.log(target.body.childNodes);
  this.mirror = mirror;
  this.knownNodes = new MutationSummary.NodeMap;
  this.deserialize = {};
  //this.deseializaKnowNodes = new MutationSummary.NodeMap;

  var rootId = this.serializeNode(target).id;
  //console.log(rootId);
  var children = [];
  for (var child = target.firstChild; child; child = child.nextSibling){
    var node = this.serializeNode(child, true);
    children.push(node);
  }

  //console.log(children);

  this.mirror.initialize(rootId, children);

  var self = this;

  var queries = [{ all: true }];

  if (testingQueries)
    queries = queries.concat(testingQueries);

  this.mutationSummary = new MutationSummary({
    rootNode: target,
    callback: function(summaries) {
      self.applyChanged(summaries);
    },
    queries: queries
  });

  this.mirror.complete();
}

TreeMirrorClient.prototype = {
  nextId: 1,

  disconnect: function() {
    if (this.mutationSummary) {
      this.mutationSummary.disconnect();
      this.mutationSummary = undefined;
    }
  },
  takeSummaries : function() {
    if (this.mutationSummary) {
      return this.mutationSummary.takeSummaries();
      //this.mutationSummary = undefined;
    }
  }
  ,

  rememberNode: function(node) {
    var id = this.nextId++;
    this.knownNodes.set(node, id);
    this.deserialize[id] = node;
    return id;
  },

  forgetNode: function(node) {
    
    delete this.deserialize[this.knownNodes.get(node)];
    delete this.knownNodes.delete(node);
    
    //delete this.deseializaKnowNodes.delete(this.knownNodes.get(node));
  },

  serializeNode: function(node, recursive) {
    if (node === null)
      return null;

    var id = this.knownNodes.get(node);
    if (id != undefined) {
      //console.log('Return id :' + id);
      //console.log(node);
      return id;
    }
    else{
        //console.log('unknown');
       // console.log(node);
    }

    //console.log(node);
    var data = {
      nodeType: node.nodeType,
      id: this.rememberNode(node)
    };
    switch(data.nodeType) {
      case Node.DOCUMENT_TYPE_NODE:
        data.name = node.name;
        data.publicId = node.publicId;
        data.systemId = node.systemId;
        break;

      case Node.COMMENT_NODE:
      case Node.TEXT_NODE:
        data.textContent = node.textContent;
        break;

      case Node.ELEMENT_NODE:
        data.tagName = node.tagName;
        data.attributes = {};
        for (var i = 0; i < node.attributes.length; i++) {
          var attr = node.attributes.item(i);
          data.attributes[attr.name] = attr.value;
        }

        if (recursive && node.childNodes.length) {
          data.childNodes = [];
          for(var child in node.childNodes){
            //console.log('Node '+child.tagName);
          }
          for (var child = node.firstChild; child; child = child.nextSibling){
            var c = this.serializeNode(child, true);
            data.childNodes.push(c);
          }
        }
        break;
    }

    return data;
  },
  deserializeNode : function(node){
      if(this.deserialize[node] != undefined)
        return this.deserialize[node];
  },

  serializeAddedAndMoved: function(changed) {
    var all = changed.added.concat(changed.reparented).concat(changed.reordered);

    var parentMap = new MutationSummary.NodeMap;
    all.forEach(function(node) {
      var parent = node.parentNode;
      var children = parentMap.get(parent)
      if (!children) {
        children = new MutationSummary.NodeMap;
        parentMap.set(parent, children);
      }

      children.set(node, true);
    });

    var moved = [];

    parentMap.keys().forEach(function(parent) {
      var children = parentMap.get(parent);

      var keys = children.keys();
      while (keys.length) {
        var node = keys[0];
        while (node.previousSibling && children.has(node.previousSibling))
          node = node.previousSibling;

        while (node && children.has(node)) {
          moved.push({
            node: this.serializeNode(node),
            previousSibling: this.serializeNode(node.previousSibling),
            parentNode: this.serializeNode(node.parentNode)
          });

          children.delete(node);
          node = node.nextSibling;
        }

        var keys = children.keys();
      }
    }, this);

    return moved;
  },

  serializeAttributeChanges: function(attributeChanged) {
    var map = new MutationSummary.NodeMap;

    Object.keys(attributeChanged).forEach(function(attrName) {
      attributeChanged[attrName].forEach(function(element) {
        var record = map.get(element);
        if (!record) {
          record = {
            node: this.serializeNode(element),
            attributes: {}
          };
          map.set(element, record);
        }

        record.attributes[attrName] = element.getAttribute(attrName);
      }, this);
    }, this);

    return map.keys().map(function(element) {
      return map.get(element);
    });
  },

  serializeCharacterDataChange: function(node) {
    return {
      node: this.serializeNode(node),
      textContent: node.textContent
    }
  },

  applyChanged: function(summaries) {

    var changed = summaries[0]
    var removed = changed.removed.map(this.serializeNode, this);
    var moved = this.serializeAddedAndMoved(changed);
    var attributes = this.serializeAttributeChanges(changed.attributeChanged);
    var text = changed.characterDataChanged.map(this.serializeCharacterDataChange, this);

    this.mirror.applyChanged(removed, moved, attributes, text);

    changed.removed.forEach(this.forgetNode, this);

    //console.log(changed);
  },

  viewerApllyChanged : function(removed, addedOrMoved, attributes, text) {
    
    function removeNode(node) {
      if(node == undefined ) return;
      if (node.parentNode)
        node.parentNode.removeChild(node);
    }

    function moveOrInsertNode(data) {
      var parent = data.parentNode;
      var previous = data.previousSibling;
      var node = data.node;
      try{
                  //if(paren)
            parent.insertBefore(node, previous ? previous.nextSibling : parent.firstChild);
      }catch(err){
            //console.log(err);
                  //console.log(node);
      }
      
    }

    function updateAttributes(data) {
      if(data == undefined) return;
      //console.log('Before');
      //console.log(data);
      var node = this.deserializeNode(data.node);

      Object.keys(data.attributes).forEach(function(attrName) {
        var newVal = data.attributes[attrName];
        if (newVal === null) {
          node.removeAttribute(attrName);
        } else {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, attrName, newVal)) {
                if(node != undefined ){
                  if(attrName == 'selected'){
                      $(node).siblings().removeAttr('selected');
                      node.setAttribute(attrName, newVal);
                      //$(node)
                      $(node.parentNode).attr('value',$(node).attr('value'));
                  }
                  else{
                    $(node).attr(attrName, newVal);
                    $(node).trigger('change');
                  }
                }
          }
        }
      }, this);

    }

    function updateText(data) {
      var node = this.deserializeNode(data.node);
      node.textContent = data.textContent;
    }

    /*addedOrMoved.forEach(function(data) {
      data.node = this.deserializeNode(data.node);
      data.previousSibling = this.deserializeNode(data.previousSibling);
      data.parentNode = this.deserializeNode(data.parentNode);

      // NOTE: Applying the changes can result in an attempting to add a child
      // to a parent which is presently an ancestor of the parent. This can occur
      // based on random ordering of moves. The way we handle this is to first
      // remove all changed nodes from their parents, then apply.
      removeNode(data.node);
    }, this); */

    //removed.map(this.deserializeNode, this).forEach(removeNode);
    //addedOrMoved.forEach(moveOrInsertNode);
    
    attributes.forEach(updateAttributes, this);
    text.forEach(updateText, this);

    /*removed.forEach(function(id) {
      delete this.idMap[id]
    }, this); */

  }
}


function TreeMirrorAdmin(root) {
  this.root = root;
  this.idMap = {};
}

TreeMirrorAdmin.prototype = {
  initialize: function(rootId, children) {

    this.idMap = {};


    this.idMap[rootId] = this.root;

    for (var i = 0; i < children.length; i++)
      this.deserializeNode(children[i], this.root);
  },

  deserializeNode: function(nodeData, parent) {
    if (nodeData === null)
      return null;

    if (typeof nodeData == 'number'){
      return this.idMap[nodeData];
    }

    var doc = this.root instanceof HTMLDocument ? this.root : this.root.ownerDocument;

    var node;

    switch(nodeData.nodeType) {
      case Node.COMMENT_NODE:
        node = doc.createComment(nodeData.textContent);
        break;

      case Node.TEXT_NODE:
        node = doc.createTextNode(nodeData.textContent);
        break;

      case Node.DOCUMENT_TYPE_NODE:
        node = doc.implementation.createDocumentType(nodeData.name, nodeData.publicId, nodeData.systemId);
        break;

      case Node.ELEMENT_NODE:
        if (this.delegate && this.delegate.createElement)
          node = this.delegate.createElement(nodeData.tagName);
        if (!node)
          node = doc.createElement(nodeData.tagName);

        Object.keys(nodeData.attributes).forEach(function(name) {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, name, nodeData.attributes[name])) {
                try{
                  //if(paren)
                   node.setAttribute(name, nodeData.attributes[name]);
                }catch(err){
                  //console.log(err);
                }
            
          }
        }, this);

        break;
    }

    this.idMap[nodeData.id] = node;

    /*if (parent){
        try{
          //if(paren)
          parent.appendChild(node);
        }catch(err){
           console.log(err);
           //console.log(node);
        }
     }*/

    if (nodeData.childNodes) {
      for (var i = 0; i < nodeData.childNodes.length; i++)
        this.deserializeNode(nodeData.childNodes[i], node);
    }

    return node;
  },

  applyChanged: function(removed, addedOrMoved, attributes, text) {
    
    function removeNode(node) {
      if(node == undefined ) return;
      if (node.parentNode)
        node.parentNode.removeChild(node);
    }

    function moveOrInsertNode(data) {
      var parent = data.parentNode;
      var previous = data.previousSibling;
      var node = data.node;
      try{
                  //if(paren)
            parent.insertBefore(node, previous ? previous.nextSibling : parent.firstChild);
      }catch(err){
            //console.log(err);
                  //console.log(node);
      }
      
    }

    function updateAttributes(data) {
      if(data == undefined) return;
      //console.log('Before');
      //console.log(data);
      var node = this.deserializeNode(data.node);

      Object.keys(data.attributes).forEach(function(attrName) {
        var newVal = data.attributes[attrName];
        if (newVal === null) {
          node.removeAttribute(attrName);
        } else {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, attrName, newVal)) {
                if(node != undefined ){
                  if(attrName == 'selected'){
                      $(node).siblings().removeAttr('selected');
                      node.setAttribute(attrName, newVal);
                      //$(node)
                  }
                  else{
                    node.setAttribute(attrName, newVal);
                    $(node).trigger('change');
                  }
                }
          }
        }
      }, this);
      
      //console.log('after : ');
      //console.log(node);

    }

    function updateText(data) {
      var node = this.deserializeNode(data.node);
      node.textContent = data.textContent;
    }

    addedOrMoved.forEach(function(data) {
      data.node = this.deserializeNode(data.node);
      data.previousSibling = this.deserializeNode(data.previousSibling);
      data.parentNode = this.deserializeNode(data.parentNode);

      // NOTE: Applying the changes can result in an attempting to add a child
      // to a parent which is presently an ancestor of the parent. This can occur
      // based on random ordering of moves. The way we handle this is to first
      // remove all changed nodes from their parents, then apply.
      removeNode(data.node);
    }, this);

    removed.map(this.deserializeNode, this).forEach(removeNode);
    addedOrMoved.forEach(moveOrInsertNode);
    
    attributes.forEach(updateAttributes, this);
    text.forEach(updateText, this);

    removed.forEach(function(id) {
      delete this.idMap[id]
    }, this);

  }
}



