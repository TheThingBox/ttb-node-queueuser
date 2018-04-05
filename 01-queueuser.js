module.exports = function(RED) {
  "use strict";

  var mqtt = require("mqtt");

  function queueTopic(n) {
    RED.nodes.createNode(this,n);
    this.topic = n.topic;
  }
  RED.nodes.registerType("queue-topic",queueTopic);

  function queueuser(n) {
    RED.nodes.createNode(this,n);

    this.msgaction = n.msgaction;
    this.element = n.element;
    this.msgtype = n.msgtype;
    this.over = n.over;
    this.ttl = n.ttl;
    this.callbackTopic = n.callbackTopic;
    this.broker = n.broker;
    this.brokerConfig = RED.nodes.getNode(this.broker);
    this.topic = n.topic;
    this.topicConfig = RED.nodes.getNode(this.topic);

    if (this.brokerConfig) {
      this.status({fill:"red",shape:"ring",text:"disconnected"});
      var brokerurl = "mqtt://"+this.brokerConfig.broker+":"+this.brokerConfig.port;
      this.client = mqtt.connect(brokerurl);
      var node = this;

      this.client.on("close",function() {
        node.status({fill:"red",shape:"ring",text:"disconnected"});
      });
      this.client.on("connect",function() {
        node.status({fill:"green",shape:"dot",text:"connected"});
      });

      this.on('input', function (msg) {
        if (msg.hasOwnProperty("msgaction")){
          if (msg.msgaction != ""){
            node.msgaction = msg.msgaction;
          }
        }
        if (msg.hasOwnProperty("callbackTopic")){
          if (msg.callbackTopic != ""){
            node.callbackTopic = msg.callbackTopic;
          }
        }

        msg.qos = 0;
        msg.retain = false;
        var topic = "sequence/"+node.topicConfig.topic+"/"+node.msgaction;
        var payload;

        switch(node.msgaction){
          case "add" :
            {
              if (msg.hasOwnProperty("ttl")){
                if (msg.ttl != ""){
                  node.ttl = msg.ttl;
                }
              }
              if (msg.hasOwnProperty("msgtype")){
                if (msg.msgtype != ""){
                  node.msgtype = msg.msgtype;
                }
              }
              if (msg.hasOwnProperty("over")){
                if (msg.callbackTopic != ""){
                  node.over = msg.over;
                }
              }
              if (node.element != ""){
                msg.payload = node.element;
              }

              var element = {};
              element.type = (node.msgtype=="")?"default":node.msgtype;
              element.ttl = (node.ttl=="")?0:Number(node.ttl);
              element.over = (node.over=="")?"add":node.over;
              msg.callbackTopic = node.callbackTopic;

              element.payload = JSON.stringify(msg);
              payload = JSON.stringify(element);
            }

            break;
          case "drop" :
          case "cons" :
            if (node.callbackTopic.trim() == ""){
              node.callbackTopic = "sequenceCallback/def";
            }
            payload = JSON.stringify({callbackTopic:node.callbackTopic});
            break;
          case "dump" :
          case "clear" :
            break;
          default:
            break;
        }

        node.client.publish(topic,payload);
        node.send(msg);
      });
    }
    else {
      this.error("missing broker configuration");
    }
    this.on('close', function() {
      if (this.client) {
        this.client.end();
      }
    });
  }
  RED.nodes.registerType("queueuser", queueuser);
}
