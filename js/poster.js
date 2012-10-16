$(function() {

    $sa.store.loadContent()

    $(".snippet").css("visibility", "visible")
    $sa("core.templates.page.default").render()
    $('.exhibit').livequery(function () {
                               $(this).exhibit({test: true})
                            })
    $('.facetSearch').livequery(function () {
                                  $(this).facetSearch({test: true})
                                })
    $('.facet').livequery(function () {
                            $(this).facet({test: true})
                          })
    $('.quicksand').livequery(function () {
                                $(this).quicksand({test: true})
                          })
    $('.snippet_content').livequery(function () { $(this).clickNScroll()})

    $sa.store.addNotification({callback:  function () {
	                                      $sa.display.refresh()
	                                  }
	                     , selector: "*"})

    document.running = true
})
