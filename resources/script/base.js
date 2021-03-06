var domready = require('domready');
var shoe = require('shoe');
var dnode = require('dnode');
var dest = require('resourceHandler');
var unicode = require('./unicode.js');
var toast = require('./Toast.js');
window.domOpts = require('domOpts');
window.unicode = unicode;
window.toast = toast;


window.base = new function(){

    var selectors = {
        root : "resourceBundleTable",
        debug : "debugIncomming",
        tpl : {
            tableBody : 'tableBody'
        }
    },
    _conf = {
        rowPrefix : "_row",
        inputPrefix : "_value",
        inputTransPrefix : "_trans"
    };

    function SaveOnLeave(node,key,bundle,text){
        var _rootKey = key; // use this key for identifier on the server
        var bundle = bundle;
        var textList = [text];
        var textIdx = 0;

        node.addEventListener('change',function(e){
            console.log("Old: "+textList[textIdx]);
            var newValue = this.value;
            if(textList[textIdx] !== newValue){
                textList.push(newValue);
                textIdx++;
            }
            console.log(textList);
            base.con.sendResource(_rootKey,bundle,newValue);
        });
    }

    function textAreaKeyPressListener(e){
        var key = e.keyCode || e.which;
        if(key == 13){
            e.returnValue = false;
        }
        return true;
    }

    function keyKeyPressListener(e){
        var key = e.keyCode || e.which;
        if(key == 32){
            e.returnValue = false;
        }
        return true;
    }

    // used on server side to call clients
    var client = {
        id : undefined, // set on server side ,
        broadCast : {fromBundle : null, toBundle : null}, // set it before setup
        updateKey : function(bundleName,data){
            var inputPrefix = _conf.inputPrefix;
            if(bundleName == base.getBundleNameTo()){
                inputPrefix = _conf.inputTransPrefix
            }
            var message = data,keyNode = document.getElementById(message.key+inputPrefix);
            console.log("updateKey: ",message);
            if(!keyNode){
                fc.printBundleTemplate([data])
            } else {
                keyNode.value = message.value;
                ui.updateInputFields(message.key,inputPrefix);
            }
        }
    }
    var ui = {
        css : {
            sendSuccess : 'sendSuccess',
            updateKey : 'updateKey'
        },
        sendSuccess : function(key,inputPrefix){
            var node1  = document.getElementById(key);
            var node2  = document.getElementById(key+inputPrefix)
            if(node1){ui.removeStateClasses(node1).domAddClass(ui.css.sendSuccess);}
            if(node2){ui.removeStateClasses(node2).domAddClass(ui.css.sendSuccess);}
        },
        updateInputFields : function(key,inputPrefix){
            var node = document.getElementById(key+inputPrefix);
            if(node){ui.removeStateClasses(node).domAddClass(ui.css.updateKey);}
        },
        removeStateClasses : function(node){
            if(!node){return;}
            var classes = '';
            for (var cssState in ui.css) {
                classes+=cssState+' ';
            }
            node.domRemoveClass(classes);
            return node;
        }
    }
    var error = {
        print : function(msg){
            var node = document.getElementById('errorPrint');
            if(!node){
                node = document.createElement('div');
                node.setAttribute('id','errorPrint');
                node.style.padding = "20px";
                node.style.backgroundColor= "#d3d3d3";
                node.style.border= "2px solid #ff0000";
                document.body.appendChild(node);
            }
            node.innerHTML = msg;
        }
    }
    // methods needs to be implemented on server side
    var con = {
        sendResource : function(key,bundle,value,cb){
            var inputPrefix = _conf.inputPrefix,cb = cb || function(){};
            if(bundle == base.getBundleNameTo()){
                inputPrefix = _conf.inputTransPrefix;
            }
            base.server.sendResource(client.id,bundle,{key: key,value:value},function(key){
                console.log('send success');
                ui.sendSuccess(key,inputPrefix);
                toast.showMessage('Auto save: "'+key+'" (success)');
                cb(key,inputPrefix);
            })
        },
        sendNewKey : function(key,value){
            base.server.sendNewKey(client.id,{key: key,value:value},function(){
                console.log('send success');
            })
        }

    }

    var fc = {
        getBundleNameFrom : function(){
            var bundle  = domOpts.params.bundle || 'messages';
            var from    = domOpts.params.from;
            return from?bundle+'_'+from: bundle;
        },
        getBundleNameTo : function(){
            var bundle  = domOpts.params.bundle || 'messages';
            var to      = domOpts.params.to;
            return bundle+'_'+to;
        },
        _addData : function(node,data,isTranslation){
            var data = data;
            var keyNode = document.createElement("input");
            var textNode = document.createElement("textarea");

            textNode.addEventListener('keypress',textAreaKeyPressListener);

            var transTextNode = document.createElement("textarea");

            keyNode.setAttribute('id', data.key);
            keyNode.setAttribute('class', 'keyField');
            keyNode.setAttribute('readonly', 'true');
            keyNode.value =  data.key;

            textNode.value =  !isTranslation?unicode.encode(data.data):'';
            textNode.setAttribute('id', data.key+_conf.inputPrefix);
            textNode.setAttribute('type', 'text');
            textNode.setAttribute('class', 'textField');

            if(domOpts.params.to){
                textNode.setAttribute('disabled', 'true');
            }

            transTextNode.value = isTranslation?unicode.encode(data.data):'';
            transTextNode.setAttribute('id', data.key+_conf.inputTransPrefix);
            transTextNode.setAttribute('type', 'text');
            transTextNode.setAttribute('class', 'textField');

            transTextNode.addEventListener('keypress',textAreaKeyPressListener);

            new SaveOnLeave(textNode,data.key,fc.getBundleNameFrom(),data.data);
            new SaveOnLeave(transTextNode,data.key,fc.getBundleNameTo(),data.data);
            var td = document.createElement('td');
            td.appendChild(keyNode);
            node.appendChild(td);
            td = document.createElement('td');
            td.appendChild(textNode);

            var tdTrans = document.createElement('td');
            tdTrans.appendChild(transTextNode);

            node.appendChild(td);
            if(domOpts.params.to){
                node.appendChild(tdTrans);
            }
        },
        _mergeData : function(data,isTranslation){
            if(isTranslation){
                document.getElementById(data.key+_conf.inputTransPrefix).value = unicode.encode(data.data);
            } else {
                document.getElementById(data.key+_conf.inputPrefix).value = unicode.encode(data.data);
            }

        },
        printBundleTemplate : function(args){
            var node = document.getElementById(selectors.tpl.tableBody);

            for (var i = 0; i < args.length; i++) {
                var row = document.getElementById(args[i].key+_conf.rowPrefix);
                if(row){
                    fc._mergeData(args[i],false);
                } else {
                    var tr = document.createElement("tr");
                    tr.setAttribute('id',args[i].key+_conf.rowPrefix);
                    fc._addData(tr,args[i],false);
                    node.appendChild(tr);
                }
            }
        },
        printBundleTranslation : function(args){
            var node = document.getElementById(selectors.tpl.tableBody);

            for (var i = 0; i < args.length; i++) {
                var row = document.getElementById(args[i].key+_conf.rowPrefix);
                if(row){
                    fc._mergeData(args[i],true);
                } else {
                    var tr = document.createElement("tr");
                    tr.setAttribute('id',args[i]+_conf.rowPrefix);
                    fc._addData(tr,args[i],true);
                    node.appendChild(tr);
                }
            }
        },
        printCreateNewBundle : function(){
            var newKeyButton = document.getElementById('addNewKeyButton');
            var newKeyValue = document.getElementById('newKey').value;
            function validateNewKey(string){
                return (string.length > 0 && string.search('\\.|,| ') == -1)?true:false;
            }
            document.getElementById('newKey').addEventListener('keypress',keyKeyPressListener);
            newKeyButton.addEventListener('click',function(){
                var newKey = document.getElementById('newKey');
                var newValue = newKey.value;
                var self = this;

                if(validateNewKey(newValue)){
                    base.con.sendResource(newValue,fc.getBundleNameFrom(),'',function(){
                        newKey.value = newKeyValue;
                        self.style.color = '#ffffff'
                        newKey.style.backgroundColor = "#ffffff";
                    });
                } else {
                    self.style.color = '#ff0000'
                    newKey.style.backgroundColor = "#ff4444";
                }
            });
        },
        printBundleOld : function(args){
            var node = document.getElementById(selectors.tpl.tableBody);

            for (var i = 0; i < args.length; i++) {
                var tr = document.createElement("tr");
                fc._addData(tr,args[i]);
                node.appendChild(tr);
            }
        },
        con : con,
        server : {},
        client : client,
        ui : ui,
        error : error
    }
    return fc
};

var stream = shoe('/dnode');
var d = dnode();


domready(function () {

    // set bundle name for only notify clients with same bundle
    base.client.broadCast.fromBundle=base.getBundleNameFrom();
    base.client.broadCast.toBundle  =base.getBundleNameTo();

    d.on('remote', function (server) {
        base.server = server;
        base.server.setupClient(base.client,function(id){
            base.client.id = id;
        });
        console.log('Connected!',server);
        var bundleFrom = base.getBundleNameFrom();
        var bundleTo = base.getBundleNameTo();
        if(bundleFrom && bundleTo){

            base.server.getMessageBundle(bundleFrom,function (s) {
                var obj = JSON.parse(s);
                base.printBundleTemplate(obj.data);
            });
            if(domOpts.params.to){
                base.server.getMessageBundle(bundleTo,function (s) {
                    var obj = JSON.parse(s);
                    base.printBundleTranslation(obj.data);
                });
            }
            base.printCreateNewBundle();
        } else {

        }
    });
    d.pipe(stream).pipe(d);

    console.log('REQUEST PARAMS: '+domOpts.params);
});