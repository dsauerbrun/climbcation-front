angular.module('trackScroll', [])
  .directive('trackScroll', function() {
    var body = document.body;

    function updateScroll(element, attr) {
      var doc = document.documentElement;
      let scrollTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
      if (scrollTop >= attr.trackScroll) {
        element.addClass('fixed');
      } else {
        element.removeClass('fixed');
      }
    }

    return {
      restrict: 'A', // only activate on element attribute
      link: function(scope, element, attr) {
        angular.element(document).on('scroll', function() {
          updateScroll(element, attr);
        });
      }
    };
  });