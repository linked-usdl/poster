// Snippets jQuery-like plugin
//

// helpers

String.prototype.htmlEncode = function ()
{
    return this.replace(/&/mg,"&amp;").replace(/</mg,"&lt;").replace(/>/mg,"&gt;").replace(/\"/mg,"&quot;")
}

String.prototype.htmlDecode = function ()
{
    return this.replace(/&lt;/mg,"<").replace(/&gt;/mg,">").replace(/&quot;/mg,"\"").replace(/&amp;/mg,"&")
}

String.prototype.encodeLiteral = function () {
        return this.replace(/\"/g, '\\"')
}

String.prototype.decodeLiteral = function () {
        return this.replace(/\\"/g, '"')
}

Object.filter = function (obj, predicate) {
    var result = {}, key
    for (key in obj) {
        if (obj.hasOwnProperty(key) && predicate(obj[key])) {
            result[key] = obj[key];
        }
    }
    return result
}

Object.first = function (obj) {
   for (var propName in jsonObj) {
      if (jsonObj.hasOwnProperty(propName)) {
          return propName;    // or do something with it and break
      }
   }
}

// the $sa object

window.$sa = function (selector) {
    return new $sa.fn.init(selector)
}

$sa.fn = $sa.prototype = {
    init: function(selector) {
        this.snippets = []
        if (selector instanceof $sa.Snippet) {
            this.snippets = [selector]
        } else if (typeof selector == "string") {
            switch (selector.charAt(0)) {
                case "*": // all available snippets
                    this.snippets = $sa.store.getAllSnippets()
                    break;
                case "#": // #tagname
                    this.snippets = $sa.store.getSnippetsByTag(selector.substr(1))
                    break
                case "@": // @username
                    break
                case "[": // [field[value]]
                    var endOfFieldPos = selector.indexOf("[",1)
                    var endOfValuePos = selector.lastIndexOf("]]")
                    if (endOfFieldPos != -1 && endOfValuePos != -1 && endOfValuePos > endOfFieldPos) {
                        this.snippets = $sa.store.getSnippetsByField(selector.substring(1,endOfFieldPos),                                                          selector.substring(endOfFieldPos+1,endOfValuePos))
                    }
                    break;
                default: // snippetname
                    snippet = $sa.store.getSnippetById(selector)
                    this.snippets = snippet ? [snippet] : []
                    break
            }
        }
        return this
    },
    length: function () {
        return this.snippets.length
    },
    eq: function (index) {
        return this.snippets[index] || null
    },
    each: function (callback) {
        for(var t=0; t<this.snippets.length; t++) {
            callback.call(this.snippets[t],t)
        }
        return this
    },
    filter: function (selector) {
        var filtered = [];

        if (typeof selector == "string") {
            switch (selector.charAt(0)) {
                case "*": // all available snippets
                    filtered = this.snippets.slice()
                    break;
                case "#": // #tagname   
                    for(t = 0; t<this.snippets.length; t++) {
                        if (this.snippets[t].tags && $.inArray(selector.substr(1),this.snippets[t].tags) !== -1) {
                            filtered.push(this.snippets[t])
                        }
                    }
                    break
                case "@": // @username
                    break
                case "[": // [field[value]]
                    var endOfFieldPos = selector.indexOf("[",1)
                    var endOfValuePos = selector.lastIndexOf("]]")
                    if (endOfFieldPos != -1 && endOfValuePos != -1 && endOfValuePos > endOfFieldPos) {
                        for (t = 0; t<this.snippets.length; t++) {
                            if (this.snippets[t][selector.substring(1,endOfFieldPos)] === selector.substring(endOfFieldPos+1,endOfValuePos)) {
                                filtered.push(this.snippets[t])
                            }
                        }
                    }
                    break
                default: // snippetname
                    break
            }
        }
        return filtered
    }
};

$sa.fn.init.prototype = $sa.fn;

$sa.fn.render = function (options) {
    var defaults = {
        displayPoint: "body"
    }
    options = $.extend({},defaults,options);
    this.each(function (i) {
        $sa.display.renderSnippet(this).appendTo($(options.displayPoint))
    })
}

$sa.fn.navigate = function (options) {
    var defaults = {
        templateTitle: "core.templates.snippet.default",
        template: undefined
    };
    options = $.extend({},defaults,options)
    options.template = options.template ? options.template : $sa.store.getSnippet(options.templateTitle)
    this.each(function() {
        $sa.display.navigateSnippet(this,options)
    })
}


$sa.utils = {}
    
    $sa.utils.arrayRemove = function (array,from,to) {
        var rest = array.slice((to || from) + 1 || array.length)
        array.length = from < 0 ? array.length + from : from
        return array.push.apply(array, rest)
    };

    $sa.utils.addField = function (fields,name,value) {
        if ($.isArray(fields[name])) {
            fields[name].push(value)
        } else if (name in fields) {
            fields[name] = [fields[name],value]
        } else {
            fields[name] = value
        }
    };
    
    $sa.utils.parseFields = function (text) {
        var fields = {}
        var lines = text.split("\n")
        for (var t=0; t<lines.length; t++) {
            var c = lines[t].indexOf(":")
            if (c != -1)
                $sa.utils.addField(fields,$.trim(lines[t].substring(0,c)),$.trim(lines[t].substring(c+1)))
        }
        return fields
    };

    $sa.utils.renderObject = function (object,excludeNames) {
        var j = $([])
        for (var n in object) {
            if (!excludeNames || $.inArray(n,excludeNames) == -1) {
                var wrapper = $("<div/>").addClass("snippet_dataRow")
                $("<span/>").addClass("snippet_dataName").text(n).appendTo(wrapper)
                $("<span/>").addClass("snippet_dataValue").text(object[n].toString()).appendTo(wrapper)
                j = j.add(wrapper)
            }
        }
        return j
    }

    $sa.utils.renderArray = function (array,excludeNames) {
        var j = $([])
        for (var t=0; t<array.length; t++) {
            if (!excludeNames || $.inArray(array[t].name,excludeNames) == -1) {
                var wrapper = $("<div/>").addClass("snippet_dataRow")
                $("<span/>").addClass("snippet_dataName").text(array[t].name).appendTo(wrapper)
                $("<span/>").addClass("snippet_dataValue").text(array[t].value).appendTo(wrapper)
                j = j.add(wrapper)
            }

        }
        return j
    }

$sa.Snippet = function (fields) {
    this.title = fields.title
    this.id = fields.id
    this.text = fields.text
    this.tags = fields.tags
    this.type = fields.type
    this.fields = fields
}

$sa.Snippet.prototype.getText = function () {
        if (typeof this.text === "function") {
        this.text = this.text()
        this.fields.text = this.text
    }
    return this.text
}

$sa.Snippet.prototype.setText = function (t) {
        this.text = t
        this.fields.text = t
}

$sa.Snippet.prototype.getFields = function () {
    return this.fields
}

$sa.Snippet.prototype.toHtml = function () {
    var html;
    var text = this.getText()
    if(text !== undefined && $.trim(text) !== "") {
        switch (this.type) {
            case "text/html":
            case "text/css":
                html = $("<div/>").html(text).contents()
                break

            case "text/javascript":
            case "text/json":
                html = $("<pre/>").text(text)
                break
            default:
                html = $("<div/>").text(text).html()
                break
        }
    }
    return html
};

$sa.store = {}
    var snippets = {};
    var notificationCallbacks = [] // Array of {callback: function(), selector: selector}
    var triggeredNotifications = [] // Subarray of notifications that have already been tripped
    var untriggeredNotifications = [] // Subarray of notifications that have not yet been tripped
    var notificationTimer = null
    
    // Add a new notification handler {callback: function, selector: selector}
    $sa.store.addNotification = function (notification) {
        notificationCallbacks.push(notification)
    }

    $sa.store.registerModification = function (snippet) {
    // Set up the timeout to actually send the notifications
	if(!notificationTimer) {
		triggeredNotifications = []
		untriggeredNotifications = notificationCallbacks.slice() // Make a shallow copy of the notifications
		notificationTimer = window.setTimeout($sa.store.sendNotifications,0)
	}
	for (var t=untriggeredNotifications.length-1; t>=0; t--) {
		var n = untriggeredNotifications[t]
		if ($sa(snippet).filter(n.selector).length == 1) {
			triggeredNotifications.push(n)
			untriggeredNotifications = $sa.utils.arrayRemove(untriggeredNotifications,t,t+1)
		}
	}
    }
    
    $sa.store.sendNotifications = function () {
        notificationTimer = null
        $.each(triggeredNotifications, function (i, val) {
                                           val.callback()
                                       })
    }
    
    // Put a snippet to the store.
    // Returns the $sa.Snippet object if successful, or null if it failed
    $sa.store.storeSnippet = function (fields) {
        if (!"title" in fields)
            return null
        var title = fields.title
        if (title === "")
            return null
        var snippet = snippets[fields.id]
        if (!snippet) {
           snippet = new $sa.Snippet(fields)
           snippets[fields.id] = snippet
//           $sa.store.registerModification(snippet)
        }
        return snippet
    }
    
    $sa.store.getAllSnippets = function () {
        var result = []
        for (var t in snippets) {
            result.push(snippets[t])
        }
        return result
    }
    
    $sa.store.getSnippetsByTag = function (tag) {
        var result = []
        for (var t in snippets) {
            if( snippets[t].tags && $.inArray(tag,snippets[t].tags) != -1)
                result.push(snippets[t])
        }
        return result
    }
    
    $sa.store.getSnippetsByField = function (field,value) {
        var result = []
        for (var t in snippets) {
            var f = snippets[t].getFields()
            if (field in f && f[field] === value)
                result.push(snippets[t])
        }
        return result
    }

    $sa.store.getSnippetById = function (id,user,source) {
        if (id in snippets)
            return snippets[id]
        else
            return null
    }
    
    $sa.store.getSnippet = function (title,user,source) {
        if (title in snippets)
            return snippets[title]
        else
            return null
    }
    
    $sa.store.loadContent = function () {
        $(".snippet").each(function () {
                             var snippet = $sa.serialisers.html.loadSnippet(this)
                             $sa.store.storeSnippet(snippet)
                           })
    }

    $sa.store.saveSnippet = function(snippet) {
            var elem = $sa.serialisers[snippet.fields.format].saveSnippet(snippet)
            return elem
    }

    $sa.store.saveStore = function (store) {

          var html = $("<html/>")
                     .append($("<head/>")
                             .append($("<title/>").text(title))
                             .append($("<style/>", { type: "text/css" }).text(".snippet { display: none; }")))
                     .append($("<body/>"))
        }

$sa.serialisers = {}

$sa.serialisers.html = {
    nodeName: "DIV",
    className: "snippet"
}
    
$sa.serialisers.html.loadSnippet = function(elem) {
        var title = $(elem).children(".snippet_title").text()
        var id = $(elem).attr("id")
        var type = $(elem).children(".snippet_type").eq(0).attr("title")
        var format = $(elem).children(".snippet_format").eq(0).attr("title")
        var html = $(elem).children(".snippet_body").clone()
        var text = function() {return html.html()}
        var tags = []
        $(elem).find(".snippet_tags a[rel='tag']").each(function(i) {
            tags.push($(this).text())
        })
        $(elem).remove()
        return {
            title: title,
            id: id,
            text: text,
            tags: tags,
            type: type?type:"text/html",
            format: format?format:"html"
        }
}

$sa.serialisers.html.saveSnippet = function (snippet) {
       var tags = $("<div/>", { "class": "snippet_tags" })
       for (var t in snippet.tags) {
           tags.append($("<a/>", { href: "#" + snippet.tags[t], rel: "tag" }).text(snippet.tags[t]))
       }
   
       return $("<div/>", { "class": "snippet", id: snippet.title})
            .append($("<h1/>", { "class": "snippet_title ui-widget-header" }))
            .append($("<abbr/>", { "class": "snippet_created published",
                                  title: snippet.created }).text(snippet.created))
            .append($("<abbr/>", { "class": "snippet_modified updated",
                                  title: snippet.updated }).text(snippet.created))
            .append(tags) 
            .append($("<div/>", { "class": "snippet_body ui-widget-content" }).text(snippet.text))
}

$sa.display = {}

    $sa.display.renderSnippet = function (snippet) {
        var html = $(snippet.toHtml())
        return html
    };

    $sa.display.navigateSnippet = function (snippet,options) {
        var defaults = {
            templateTitle: "core.templates.snippet.default",
            template: null,
            jOrigin: null
        }
        options = $.extend({},defaults,options)
        options.template = options.template ? options.template : $sa.store.getSnippet(options.templateTitle)

        var elemSnippet = $("[data-snippet-id='" + snippet.id + "'].snippetFrame")
        if (elemSnippet.length === 0) {
            elemSnippet = $sa.display.chooseDisplayPoint(snippet,options)
        } else {
            elemSnippet = elemSnippet.eq(0)
        }

        elemSnippet.addClass("snippetFrame")
        elemSnippet.attr("data-snippet-id",snippet.id)
        elemSnippet.attr("data-template-id",options.template.id)
        elemSnippet.data("options", options)
        elemSnippet.addClass("dataTag")
        var html = $(options.template.toHtml())
        elemSnippet.html(html)
    }
    
    $sa.display.chooseDisplayPoint = function (snippet,options) {
        var elemSnippet = null

        if (elemSnippet === null && options.displayPoint) {
            elemSnippet = $("<div>")
            elemSnippet.appendTo(options.displayPoint)
        }

        if (elemSnippet === null) {
            var containers = $(".snippetContainer")
            containers.each(function(i) {
                if(elemSnippet === null) {
                    elemSnippet = $sa.display.createSnippetFrameInContainer($(this),snippet,options)
                }
            })
        }
        if (elemSnippet === null) {
            elemSnippet = $("<div>")
            elemSnippet.appendTo("body")
        }
        return elemSnippet
    }
    
    $sa.display.createSnippetFrameInContainer = function (elemContainer,snippet,options) {
        var elemSnippet = null
        elemSnippet = $sa.display.insertSnippetFrameInContainer(elemContainer,snippet,options)
        return elemSnippet
    }
    
    $sa.display.refresh = function() {
	$sa.display.refreshNodes($(document).children())
    }

    $sa.display.refreshNodes = function(elements) {
	$sa.display.processNodes("refresh", elements)
    }

    $sa.display.processNodes = function(method,elements) {
	$(elements).each(function(i) {
			   var e = $(this);
			   if (!e.hasClass("ignore")) {
			      if (e.hasClass("macro")) {
                                  var it = e.clone(true)
                                  var p = e.parent()
                                  it.insertAfter(e)
                                  e.remove()
//                                  $sa.display.processNodes(method,it.children());
			      } else {
				var c = e.children()
				if (c)
                                   $sa.display.processNodes(method,c)
			      }
			   }
		         })
    }
    
    $sa.display.insertSnippetFrameInContainer = function (elemContainer,snippet,options) {
        var elemSnippet = null
        elemSnippet = $("<div/>").appendTo(elemContainer.find(".snippetContent").eq(0))
        return elemSnippet
    }


$('.transclude').livequery(function () {
   $(this).addClass('macro')
   if (document.running) {
        var title = $(this).attr("data-snippet")
        var templateTitle = $(this).attr("data-template")
        var template = templateTitle ? $sa.store.getSnippet(templateTitle) : null
        var snippet = $sa.store.getSnippetById(title)
        var param = $(this).attr("data-parameter")
        if (param) {
           $(this).data("options", {param: param})
           $(this).addClass("dataTag")
        }
        if (template) {
            $(this).addClass("snippetFrame")
            $(this).attr("data-snippet-id",snippet.id)
            $(this).attr("data-template-id",template.id)
            html = $(template.toHtml())
            $(this).html(html)
        } else {
            html = $(snippet.toHtml())
            $(this).html(html)
        }
   }
})

// view
$('.snippetView').livequery(function () {
   $(this).addClass('macro')
   if (document.running) {
        var field = $(this).attr("data-field")
        var fmt = $(this).attr("data-format")
        var className = $(this).attr("data-class")
        var snippetFrame = $(this).closest(".snippetFrame")
        var title = snippetFrame.attr("data-snippet-id")
        var snippet = $sa.store.getSnippetById(title)
        var fields = snippet.getFields()
        if (field in fields) {
            switch(fmt) {
                case "text":
                    $(this).text(fields[field])
                    break
                case "html":
                    if(field === "text") {
                        $(this).html(snippet.toHtml())
                    } else {
                        $(this).html(fields[field])
                    }
            }
        }
        if (className)
            $(this).addClass(className)
   }
})

$sa.actions = {};

$sa.actions.snippet_close = function(target,e) {
    var elemSnippet = target.closest(".snippetFrame")
    if (elemSnippet) {
        elemSnippet.hide("drop",{direction: "down"},500,function() {elemSnippet.remove() })
    }
}

$sa.command = {};
$sa.command.commands = {
    close_snippet: {text: "Close this card", action: $sa.actions.snippet_close}
};


//simple button functionality

        $('.command').livequery(function () {
		$(this).addClass('macro')
                var commandName = $(this).attr("data-name")
                var command = $sa.command.commands[commandName]
                if (command) {
                   $(this).attr("title",command.text)
                   var self = this
                   $(this).bind("click",function (e) {
                                           command.action($(self),e)
                                         })
                }
             })

        $('.link').livequery(function () {
             var subj = params.subject //$.cookie('subject')
             var param = $(this).attr("data-parameter")
             if (subj && (subj == param)) $(this).parent().addClass('ui-selected')
             $(this).addClass('macro')
             if ($(this).text() == "") $(this).text($(this).attr("placeholder"))
             $(this).click(function(e) {
                             var target = $(this).attr("data-link-target")
                             var options = {jOrigin: this}
                             var persist = $(this).attr("data-persist")
                             var param = $(this).attr("data-parameter")
                             if (param) options.param = param
                             if (persist) {
                                params.subject = param //$.cookie(persist, param)
			        var current = $("#columnStory .snippetFrame")
                                if (current.length > 0)
                                    current.hide("puff", {}, "normal",
                                          function() {
                                              $(this).remove()
                                              show(params.activeTab, params.subject)
                                          })
                                else
                                      show(params.activeTab, params.subject)
                             } else
                                $sa(target).navigate(options)
			     return true
                         })
             })

