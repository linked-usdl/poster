(function($) {



$.fn.exhibit = function(options) {
    var defaults = {}
    var options = $.extend({}, defaults, options)

    return this.each(function() {
       var $this = $(this)

       var exhibit = {
          facets : [],
          query : $this.attr('data-query'),
          variables : $this.attr('data-variables'),
          endpoint : $this.attr('data-endpoint'),
          namespaces : $this.find('[data-namespace]')
                      .map(function () {
                           var ns = $(this).attr('data-namespace').split(' ')
                           return { id: ns[0],
                                    url: ns[1] } })
                      .get(),
          update : function () {
                         if (exhibit.view) exhibit.view.update()
                      },
          getQuery : function () {
                         subs = ""
                         exhibit.facets.forEach(function (f) { subs += f.getQuery() })
                         return subs
                        }
         }
        $this.data("exhibit", exhibit)
        exhibit.update()
        return $this
     })
}

$.fn.facetSearch = function(options) {
    var defaults = {}
    var options = $.extend({}, defaults, options)

    return this.each(function() {
       var $this = $(this)
       var exhibit = $this.parents('.exhibit:first').data('exhibit')
 

       var facet = {
           query : $this.attr('data-query'),
           title : $this.attr('data-facetLabel'),
           getQuery : function () {
                          var val = $('input', $this).val()
                          return val?
                                 $this.data('facetSearch').query
                                      .replace('?regex', '"'+val+'"')
                                      .replace('?i', '"i"')
                                 :""
                        },
           update : function () {}
         } 
       $this.data('facetSearch', facet)
       var exHeader = $('<div/>', {class: "facet-header"})
                      .append($('<span />', {class: 'facet-header-title'}).text(facet.title))
                      .appendTo($this)
       var exBody = $('<div/>', {class: 'facet-body'})
                     .append($('<input/>', {class: 'facet-search-box'})
                     .change(function () {
                               exhibit.update()
                             })
                            )
                     .appendTo($this)
// push facet to be updated
        exhibit.facets.push(facet)
        return $this
     })
}


$.fn.facet = function(options) {
    var defaults = {}
    var options = $.extend({}, defaults, options)

    return this.each(function() {
       var $this = $(this)
       var exhibit = $this.parents('.exhibit:first').data('exhibit')
       var facet = {
          expression : $this.attr('data-expression'),
          query : $this.attr('data-query'),
          title : $this.attr('data-facetLabel'),
          namespaces : $this.attr('data-namespace'),
          selected : {},
          getQuery : function () {
                         var sub = ""
                         $.each(facet.selected, (function (s) {
                             var so = facet.selected[s]
                             if (so) {
                                sub = ((sub)?sub + 'UNION {':'{')
                                    + facet.query.replace('?'+facet.expression,
                                                          ((so.type=='uri')?
                                                            ('<' + s + '>')
                                                          :('"') + s + '"'))
                                    + '} '
                             }
                          }))
                         return sub
                        },
          update : function () {
                         exBody.empty()
                         var ns = $.map(exhibit.namespaces,
                                        function(ns) {
                                          return 'PREFIX ' + ns.id + ' <' + ns.url + '>\n'
                                        }).join('')
                         var query = ns
                                   + "select distinct ?"+ facet.expression + " where {"
                                   + exhibit.query
                                   + facet.query + "}"

                         sparql.query(exhibit.endpoint,
                                      query,
                                      function (data) {
                                        data.results.bindings.forEach(function (elem) {
                                           var fac = elem[facet.expression]
                                           var val = (fac.type == 'literal')?
                                                      fac.value
                                                     :fac.value.split('#')[1]
                                           var label = $('<label class="facet-label"/><br/>')
                                                       .appendTo(exBody)
                                           var input = $('<input type="checkbox" />')
                                                       .appendTo(label)
                                                       .change(function () {
                                                                 facet.selected[fac.value]=
                                                                 facet.selected[fac.value]?false:fac
                                                                 exhibit.update()
                                                               })
                                           input.attr('checked',facet.selected[fac.value])
                                           label.append(val)
                                        })
                                      },
                                      function (status, msg, xhr) {
                                         alert(status+', '+msg)
                                      })
                      }
       }
       $this.data('facet', facet)

       var exHeader = $('<div/>', {class: "facet-header"})
                       .append($('<span/>', {class: 'facet-header-title'}).text(facet.title))
                       .appendTo($this)
       var exBody = $('<div/>', {class: 'facet-body', style: 'display: block;'}).appendTo($this)

       exhibit.facets.push($this.data('facet'))
       facet.update()
       return $this
    })
}


$.fn.quicksand = function(options) {
    var defaults = {}
    var options = $.extend({}, defaults, options)

    return this.each(function() {
       var $this = $(this)
       var exhibit = $(this).parents('.exhibit:first').data('exhibit')
       var exLens = $(this).find('.lens')

       $('.view-switcher-button', $this).click(function(e) {
           view.view = $(this).attr('id')
           view.update()
           $(this).parent().find('.ui-state-active').removeClass('ui-state-active')
           $(this).addClass('ui-state-active')
       })

       var content = $('#quicksand', $this)

       $(content).masonry({itemSelector: "li",
                           isAnimated: true,
                           animationOptions: { easing: 'easeInOutQuad'},
                           containerStyle: { position: 'absolute' },
                           isFitWidth: true })

       var map = $('.map', $(this))
       var elems = $('.elems', $(this))

       var show = { "literal":  function (v) { return v },
                    "uri":  function (v) { return v },
                    "uri-anchor":  function (v) { return v.split('#')[1] }
                  }

       var view = {
             lens : { 
                      prototype: exLens,
                      queries: exLens.find('[data-query]')
                                     .map(function () {
                                            return $(this).attr('data-query')
                                          }).get()
                    },
             view : "tiles",
             update : function () {
                        var ns = $.map(exhibit.namespaces,
                                       function(ns) {
                                          return 'PREFIX ' + ns.id + ' <' + ns.url + '>\n'
                                       }).join('')
                        var subs = exhibit.getQuery()
                        var query = ns
                                  + "select distinct "
                                  + exhibit.variables
                                  + " where {"
                                  + exhibit.query + "\n"
                                  + subs
                                  + view.lens.queries.join('\n')
                                  + "} limit 100\n"
                        sparql.query(exhibit.endpoint,
                                     query,
                                     function (data) {
                                       elems.empty()
                                       data.results.bindings.forEach(
                                          function(elem) {
                                             var c = exLens.clone()
                                             var sid = elem[c.attr('data-id')].value
                                             var li = $('<li/>', {'sid': $.md5(sid)})
                                                      .appendTo(elems)
                                                      .addClass((Math.random()<0.8)?'lens1':'lens2')

                                             c.find('[data-content]').each(function () {
                                                 var e = elem[$(this).attr('data-content')]
                                                 $(this).html(show[$(this).attr('data-show')](e.value))
                                             })
                                             c.find('[data-attribute]').each(function () {
                                                 var e = elem[$(this).attr('data-attribute')]
                                                 var n = $(this).attr('data-attribute-name')
                                                 $(this).attr(n, show[$(this).attr('data-show')](e.value))
                                             })
                                             c.show().appendTo(li)
                                           })
                                       if (view.view == "tiles") {
                                          $(map).hide()
                                          $(content).show() //.empty()
                                             .masonry( 'remove', $(content).find('li'))
                                             .masonry('reloadItems')
                                          var e = $(elems).find('li')
                                          $(content).append(elems.find('li'))
                                             .masonry('reloadItems')
                                             .masonry()
                                       } else {
                                          $(content).hide()
                                          $(map).show().gmap3({zoom: 8}).gmap3({list: 'marker', action: 'clear'})
                                          data.results.bindings.forEach(
                                            function(m) {
                                              if (m.city) {
                                                var addr = (m.postcode?m.postcode.value:'')
                                                         + ' ' + (m.city?m.city.value:'')
                                                         + ', ' + (m.street?m.street.value:'')
                                                $(map).gmap3({
                                                    action:   'addmarker',
                                                    address:  addr,
                                                    map: { center: true }
                                                })
                                              }
                                            })
                                       }
                                      })
                                    }
                   }
               $this.data('quicsand', view)
               exhibit.view = view
               return $this
        })
    }

    sparql = {}

    sparql.query = function(url, q, sk, fk) {
/*
                    if (window.netscape) try {
                      netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead")
                      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
                    } catch (e) {
                      if (fk) fk("no data", "priviledges denied!")
                    }
*/
                    var options = {
                       type: "GET",
                  //     contentType: "application/x-www-form-urlencoded",
                       url: url,
                       dataType: "json",

                       beforeSend: function(xhrObj) {
                             xhrObj.setRequestHeader("Accept","application/sparql-results+json")
                       },

                       data: { 
                             "query": q,
                             "output": "json"
//                             , "soft-limit": ""
                               },
                       success: sk,
                       error: fk
                    }
                    $.ajax(options)
                    return true
    }

})(jQuery)
